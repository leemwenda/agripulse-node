#!/usr/bin/env python3
"""AgriPulse cow re-identification service. Runs on the Pop!_OS laptop only.

Reuses ~/agripulse-ai/gradio_app.py UNCHANGED for the checkpoint, preprocessing,
embeddings, cow check and clustering. This file only adds an authenticated HTTP layer.
Every write goes through gradio_app's own save functions.

Run:
  REID_TOKEN=... REID_DIR=~/agripulse-ai uvicorn reid_service:app --host 127.0.0.1 --port 7861
"""
import hmac
import io
import json
import os
import re
import sys
import threading

import torch.nn.functional as F
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse
from PIL import Image

REID_DIR = os.path.realpath(os.path.expanduser(os.environ.get("REID_DIR", "~/agripulse-ai")))
TOKEN = os.environ.get("REID_TOKEN", "")
if len(TOKEN) < 32:
    raise SystemExit("REID_TOKEN must be set to at least 32 characters.")
if not os.path.isdir(REID_DIR):
    raise SystemExit(f"REID_DIR not found: {REID_DIR}")

# gradio_app.py resolves its checkpoint and cow_database.json relative to the working directory.
os.chdir(REID_DIR)
sys.path.insert(0, REID_DIR)
import gradio_app as g  # noqa: E402  (original module, unchanged)

INDEX_PATH = os.path.join(REID_DIR, "reid_reference_index.json")
COLLECTED_ROOT = os.path.realpath(os.path.join(REID_DIR, "collected_data"))
KEY_RE = re.compile(r"animal-\d{1,12}")
MAX_BYTES = 10 * 1024 * 1024
MAX_PHOTOS = 100
LOCK = threading.Lock()


def require_token(x_service_token: str = Header(default="")):
    if not hmac.compare_digest(x_service_token.encode(), TOKEN.encode()):
        raise HTTPException(401, "unauthorized")


app = FastAPI(title="AgriPulse Re-ID", docs_url=None, redoc_url=None, openapi_url=None,
              dependencies=[Depends(require_token)])


def valid_key(key: str) -> bool:
    return KEY_RE.fullmatch(key) is not None


def load_index() -> dict:
    if not os.path.exists(INDEX_PATH):
        return {}
    with open(INDEX_PATH) as f:
        return json.load(f)


def save_index(index: dict) -> None:
    tmp = INDEX_PATH + ".tmp"
    with open(tmp, "w") as f:
        json.dump(index, f)
    os.replace(tmp, INDEX_PATH)


async def read_photo(upload: UploadFile) -> bytes:
    data = await upload.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "photo too large (max 10 MB)")
    return data


def decode(data: bytes) -> Image.Image:
    img = Image.open(io.BytesIO(data))
    img.load()
    return img.convert("RGB")


async def screen_uploads(photos, reject_non_cow: bool):
    """Returns (kept, rejected, errors). kept items are (index, name, pil_image, embedding)."""
    kept, rejected, errors = [], [], []
    for i, upload in enumerate(photos):
        name = os.path.basename(upload.filename or f"photo-{i}")
        try:
            img = decode(await read_photo(upload))
        except HTTPException as e:
            errors.append(f"{name}: {e.detail}")
            continue
        except Exception:
            errors.append(f"{name}: unreadable image")
            continue
        if reject_non_cow:
            try:
                ok, label = g.looks_like_cow(img)
            except Exception:
                ok, label = True, None  # a detector failure must not block the farmer
            if not ok:
                rejected.append(f"{name}: looks like '{label}', not cattle")
                continue
        kept.append((i, name, img, g.get_embedding(img)))
    return kept, rejected, errors


@app.get("/health")
def health():
    return {"status": "ok", "device": str(g.device), "threshold": g.MATCH_THRESHOLD}


@app.post("/identify")
async def identify(photo: UploadFile = File(...), top_k: int = Form(5)):
    img = decode(await read_photo(photo))
    try:
        ok, label = g.looks_like_cow(img)
    except Exception:
        ok, label = True, None
    if not ok:
        return {"status": "not_cattle", "label": label, "candidates": []}
    db = g.load_database()
    if not db:
        return {"status": "empty", "candidates": []}
    index = load_index()
    query = g.get_embedding(img)
    rows = []
    for key, refs in db.items():
        if not valid_key(key) or not refs:
            continue  # legacy free-text labels are never linked to animal records
        sims = [F.cosine_similarity(query.unsqueeze(0), r.unsqueeze(0)).item() for r in refs]
        best = max(range(len(sims)), key=lambda i: sims[i])
        aligned = len(index.get(key, [])) == len(refs)
        rows.append({
            "key": key,
            "similarity": round(sum(sims) / len(sims), 4),
            "bestReferenceSimilarity": round(sims[best], 4),
            "referenceIndex": best if aligned else None,
            "referencePhotos": len(refs),
        })
    rows.sort(key=lambda r: -r["similarity"])
    return {"status": "ok", "threshold": g.MATCH_THRESHOLD,
            "candidates": rows[: max(1, min(top_k, 10))]}


@app.post("/register")
async def register(animalKey: str = Form(...), photos: list[UploadFile] = File(...),
                   reject_non_cow: bool = Form(True)):
    if not valid_key(animalKey):
        raise HTTPException(400, "invalid animal key")
    if not photos or len(photos) > MAX_PHOTOS:
        raise HTTPException(400, f"send 1 to {MAX_PHOTOS} photos")
    kept, rejected, errors = await screen_uploads(photos, reject_non_cow)
    if not kept:
        return {"saved": 0, "totalReference": None, "rejected": rejected, "errors": errors}
    with LOCK:
        db = g.load_database()
        index = load_index()
        before = len(db.get(animalKey, []))
        if len(index.get(animalKey, [])) != before:
            index[animalKey] = []  # earlier saves are not aligned: previews stay off for this animal
        new_paths = [g.save_to_collected_data(animalKey, t[2]) for t in kept]
        db.setdefault(animalKey, []).extend([t[3] for t in kept])
        g.save_database(db)
        index[animalKey] = index.get(animalKey, []) + new_paths
        save_index(index)
    return {"saved": len(kept), "totalReference": len(db[animalKey]),
            "rejected": rejected, "errors": errors}


@app.post("/group")
async def group(photos: list[UploadFile] = File(...), threshold: float = Form(0.5),
                reject_non_cow: bool = Form(True)):
    if not 0.1 <= threshold <= 0.9:
        raise HTTPException(400, "threshold must be between 0.1 and 0.9")
    if not photos or len(photos) > MAX_PHOTOS:
        raise HTTPException(400, f"send 1 to {MAX_PHOTOS} photos")
    kept, rejected, errors = await screen_uploads(photos, reject_non_cow)
    if not kept:
        return {"groups": [], "rejected": rejected, "errors": errors, "message": "Nothing left to group."}
    groups = g.cluster_by_similarity([t[3] for t in kept], threshold)
    return {
        "groups": [{"group": n + 1,
                    "photoIndexes": [kept[j][0] for j in grp],
                    "files": [kept[j][1] for j in grp]} for n, grp in enumerate(groups)],
        "rejected": rejected,
        "errors": errors,
    }


@app.get("/photo/{key}/{n}")
def reference_photo(key: str, n: int):
    if not valid_key(key):
        raise HTTPException(400, "invalid key")
    refs = g.load_database().get(key, [])
    paths = load_index().get(key, [])
    if not paths or len(paths) != len(refs) or not (0 <= n < len(paths)):
        raise HTTPException(404, "no preview available")
    path = os.path.realpath(paths[n])
    if not path.startswith(COLLECTED_ROOT + os.sep) or not os.path.isfile(path):
        raise HTTPException(404, "photo missing")
    return FileResponse(path, media_type="image/jpeg")
