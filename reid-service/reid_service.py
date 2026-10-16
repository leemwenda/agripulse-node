#!/usr/bin/env python3
"""AgriPulse cow re-identification service. INTERNAL ONLY.
Run with: REID_TOKEN=... REID_DIR=~/agripulse-ai uvicorn reid_service:app --host 127.0.0.1 --port 7861
Every request must send header X-Service-Token. Never expose this port publicly."""
import hmac, io, json, os, re, threading
from datetime import datetime
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as models
import torchvision.transforms as T
import torchvision.models.detection as detection_models
from PIL import Image
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile

HERE = os.path.dirname(os.path.abspath(__file__))
REID_DIR = os.path.expanduser(os.environ.get("REID_DIR", HERE))
CHECKPOINT = os.path.join(REID_DIR, "cow_embedding_resnet50_v2.pt")
DB_PATH = os.path.join(REID_DIR, "cow_database.json")
DATA_DIR = os.path.join(REID_DIR, "collected_data")
PENDING_DIR = os.path.join(DATA_DIR, "_pending_groups")
TOKEN = os.environ.get("REID_TOKEN", "")
MATCH_THRESHOLD = float(os.environ.get("REID_THRESHOLD", "0.5"))
USE_DETECTOR = os.environ.get("REID_DETECT", "1") == "1"
NON_COW_SCORE = 0.3
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_BATCH = 100
COW_ID_RE = re.compile(r"[A-Za-z0-9_-]{1,40}")

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
DB_LOCK = threading.Lock()

class CowEmbeddingNet(nn.Module):
    def __init__(self, embedding_dim=128):
        super().__init__()
        resnet = models.resnet50(weights=None)
        self.backbone = nn.Sequential(*list(resnet.children())[:-1])
        self.embedding = nn.Linear(2048, embedding_dim)

    def forward(self, x):
        x = torch.flatten(self.backbone(x), 1)
        return F.normalize(self.embedding(x), p=2, dim=1)

transform = T.Compose([
    T.Resize((224, 224)),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

if not os.path.exists(CHECKPOINT):
    raise SystemExit(f"Checkpoint not found: {CHECKPOINT}")
model = CowEmbeddingNet().to(device)
checkpoint = torch.load(CHECKPOINT, map_location=device)
model.load_state_dict(checkpoint["model_state_dict"])
model.eval()

_detector = None
_det_tf = None
_det_cats = None

def _load_detector():
    global _detector, _det_tf, _det_cats
    if _detector is not None:
        return
    weights = detection_models.FasterRCNN_ResNet50_FPN_V2_Weights.DEFAULT
    _detector = detection_models.fasterrcnn_resnet50_fpn_v2(weights=weights).to(device)
    _detector.eval()
    _det_tf = weights.transforms()
    _det_cats = weights.meta["categories"]

def classify(img):
    """Returns (is_cattle_or_unknown, top_label). Rejects only when a confident non-cow object is seen."""
    if not USE_DETECTOR:
        return True, None
    _load_detector()
    with torch.no_grad():
        out = _detector([_det_tf(img).to(device)])[0]
    has_cow, top, top_score = False, None, 0.0
    for lab, sc in zip(out["labels"].tolist(), out["scores"].tolist()):
        if sc < NON_COW_SCORE:
            continue
        name = _det_cats[lab]
        if name == "cow":
            has_cow = True
        if sc > top_score:
            top_score, top = sc, name
    if has_cow or top is None:
        return True, top
    return False, top

def embed(img):
    x = transform(img.convert("RGB")).unsqueeze(0).to(device)
    with torch.no_grad():
        return model(x).squeeze(0).cpu()

def validate_cow_id(value):
    value = (value or "").strip()
    if not COW_ID_RE.fullmatch(value):
        raise HTTPException(400, "Cow ID must be 1-40 letters, digits, dashes or underscores.")
    return value

def load_db():
    with DB_LOCK:
        if not os.path.exists(DB_PATH):
            return {}
        with open(DB_PATH) as f:
            raw = json.load(f)
    return {k: [torch.tensor(e) for e in v] for k, v in raw.items()}

def add_to_db(cow_id, embs):
    with DB_LOCK:
        raw = {}
        if os.path.exists(DB_PATH):
            with open(DB_PATH) as f:
                raw = json.load(f)
        raw.setdefault(cow_id, []).extend(e.tolist() for e in embs)
        tmp = DB_PATH + ".tmp"
        with open(tmp, "w") as f:
            json.dump(raw, f)
        os.replace(tmp, DB_PATH)
        return len(raw[cow_id])

def save_collected(cow_id, img):
    d = os.path.join(DATA_DIR, cow_id)
    os.makedirs(d, exist_ok=True)
    path = os.path.join(d, datetime.now().strftime("%Y%m%d_%H%M%S_%f") + ".jpg")
    img.convert("RGB").save(path, "JPEG", quality=92)
    return path

async def process_batch(files, reject_non_cow):
    """Returns (kept, rejected, errors). kept items hold name, PIL image and embedding."""
    kept, rejected, errors = [], [], []
    for f in files:
        name = os.path.basename(f.filename or "photo")
        data = await f.read()
        if len(data) > MAX_IMAGE_BYTES:
            errors.append(f"{name}: file too large")
            continue
        try:
            img = Image.open(io.BytesIO(data))
            img.load()
            img = img.convert("RGB")
        except Exception:
            errors.append(f"{name}: unreadable image")
            continue
        if reject_non_cow:
            try:
                ok, label = classify(img)
            except Exception:
                ok, label = True, None  # detector failure must not block the farmer
            if not ok:
                rejected.append(f"{name}: looks like '{label}', not cattle")
                continue
        kept.append({"name": name, "img": img, "emb": embed(img)})
    return kept, rejected, errors

def cluster(embs, threshold):
    """Complete-linkage: clusters merge only if every pair across them meets the threshold."""
    n = len(embs)
    if n == 0:
        return []
    if n == 1:
        return [[0]]
    sim = [[0.0] * n for _ in range(n)]
    for i in range(n):
        sim[i][i] = 1.0
        for j in range(i + 1, n):
            s = F.cosine_similarity(embs[i].unsqueeze(0), embs[j].unsqueeze(0)).item()
            sim[i][j] = sim[j][i] = s
    clusters = [[i] for i in range(n)]
    while len(clusters) > 1:
        best, best_score = None, threshold
        for a in range(len(clusters)):
            for b in range(a + 1, len(clusters)):
                sc = min(sim[i][j] for i in clusters[a] for j in clusters[b])
                if sc >= best_score:
                    best_score, best = sc, (a, b)
        if best is None:
            break
        a, b = best
        clusters[a] = clusters[a] + clusters[b]
        del clusters[b]
    return sorted(clusters, key=len, reverse=True)

def check_token(x_service_token: str = Header(default="")):
    if not TOKEN or not hmac.compare_digest(x_service_token.encode(), TOKEN.encode()):
        raise HTTPException(401, "unauthorized")

app = FastAPI(title="AgriPulse Re-ID", docs_url=None, redoc_url=None, openapi_url=None,
              dependencies=[Depends(check_token)])

@app.get("/health")
def health():
    return {"status": "ok", "device": str(device), "detector": USE_DETECTOR}

@app.get("/cows")
def cows():
    return {"cows": [{"cowId": k, "referencePhotos": len(v)} for k, v in sorted(load_db().items())]}

@app.post("/identify")
async def identify(photo: UploadFile = File(...)):
    data = await photo.read()
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "Photo too large (max 10 MB).")
    try:
        img = Image.open(io.BytesIO(data)); img.load(); img = img.convert("RGB")
    except Exception:
        raise HTTPException(400, "Unreadable image.")
    try:
        ok, label = classify(img)
    except Exception:
        ok, label = True, None
    if not ok:
        return {"status": "not_cattle", "message": f"This doesn't look like cattle (looks like '{label}')."}
    db = load_db()
    if not db:
        return {"status": "empty", "message": "No cows registered yet."}
    q = embed(img)
    scores = {cid: sum(F.cosine_similarity(q.unsqueeze(0), r.unsqueeze(0)).item() for r in refs) / len(refs)
              for cid, refs in db.items()}
    ranked = sorted(scores.items(), key=lambda x: -x[1])
    best, sim = ranked[0]
    return {
        "status": "match" if sim >= MATCH_THRESHOLD else "no_confident_match",
        "bestCowId": best,
        "confidence": round(sim, 4),
        "threshold": MATCH_THRESHOLD,
        "ranking": [{"cowId": c, "similarity": round(s, 4)} for c, s in ranked],
    }

@app.post("/register")
async def register(cowId: str = Form(...), photos: list[UploadFile] = File(...), reject_non_cow: bool = Form(True)):
    cow_id = validate_cow_id(cowId)
    if len(photos) > MAX_BATCH:
        raise HTTPException(413, f"Batch limit is {MAX_BATCH} photos.")
    kept, rejected, errors = await process_batch(photos, reject_non_cow)
    total = None
    if kept:
        for k in kept:
            save_collected(cow_id, k["img"])
        total = add_to_db(cow_id, [k["emb"] for k in kept])
    return {"saved": len(kept), "totalReference": total, "rejected": rejected, "errors": errors}

@app.post("/confirm")
async def confirm(cowId: str = Form(...), photo: UploadFile = File(...)):
    cow_id = validate_cow_id(cowId)
    kept, rejected, errors = await process_batch([photo], False)
    if not kept:
        raise HTTPException(400, "Unreadable image.")
    save_collected(cow_id, kept[0]["img"])
    total = add_to_db(cow_id, [kept[0]["emb"]])
    return {"message": f"Confirmed as '{cow_id}'. Saved as training data.", "totalReference": total}

@app.post("/group")
async def group(photos: list[UploadFile] = File(...), threshold: float = Form(MATCH_THRESHOLD), reject_non_cow: bool = Form(True)):
    if len(photos) > MAX_BATCH:
        raise HTTPException(413, f"Batch limit is {MAX_BATCH} photos.")
    if not 0.1 <= threshold <= 0.9:
        raise HTTPException(400, "Threshold must be between 0.1 and 0.9.")
    kept, rejected, errors = await process_batch(photos, reject_non_cow)
    if not kept:
        return {"session": None, "groups": [], "rejected": rejected, "errors": errors, "message": "Nothing left to group."}
    groups = cluster([k["emb"] for k in kept], threshold)
    session = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    sdir = os.path.join(PENDING_DIR, session)
    out = []
    for gi, idxs in enumerate(groups, 1):
        gdir = os.path.join(sdir, f"group_{gi}")
        os.makedirs(gdir, exist_ok=True)
        names = []
        for n, idx in enumerate(idxs):
            kept[idx]["img"].save(os.path.join(gdir, f"{n:03d}.jpg"), "JPEG", quality=92)
            names.append(kept[idx]["name"])
        out.append({"group": gi, "count": len(idxs), "files": names})
    return {"session": session, "groups": out, "rejected": rejected, "errors": errors}

@app.post("/group/save")
async def group_save(session: str = Form(...), assignments: str = Form(...)):
    if not re.fullmatch(r"[0-9_]{8,40}", session):
        raise HTTPException(400, "Invalid session.")
    sdir = os.path.join(PENDING_DIR, session)
    if not os.path.isdir(sdir):
        raise HTTPException(404, "Session not found. Run grouping again.")
    try:
        amap = json.loads(assignments)
        if not isinstance(amap, dict) or not amap:
            raise ValueError
    except Exception:
        raise HTTPException(400, "Assignments must be a JSON object like {\"1\": \"AGP-00127\"}.")
    results = []
    for gkey, cow in amap.items():
        try:
            gnum = int(gkey)
            cid = validate_cow_id(str(cow))
        except Exception:
            results.append({"group": gkey, "status": "skipped", "reason": "invalid group or cow ID"})
            continue
        gdir = os.path.join(sdir, f"group_{gnum}")
        if not os.path.isdir(gdir):
            results.append({"group": gnum, "status": "skipped", "reason": "group not found"})
            continue
        embs, count = [], 0
        for fn in sorted(os.listdir(gdir)):
            img = Image.open(os.path.join(gdir, fn)).convert("RGB")
            embs.append(embed(img))
            save_collected(cid, img)
            count += 1
        total = add_to_db(cid, embs)
        results.append({"group": gnum, "status": "saved", "cowId": cid, "photos": count, "totalReference": total})
    return {"results": results}
