"""Single-photo suitability check. Adds POST /verify to reid_service without changing existing routes.
Returns raw detector numbers plus a provisional status. The AgriPulse server makes the final decision.
Thresholds are uncalibrated until measured on labelled photos."""
import io, os, threading
from fastapi import File, HTTPException, UploadFile
from PIL import Image, ImageOps

COW_MIN = float(os.environ.get("VERIFY_COW_MIN", "0.5"))      # cow at or above this: cow
COW_WEAK = float(os.environ.get("VERIFY_COW_WEAK", "0.15"))   # weak cow signal: uncertain
OBJECT_MIN = float(os.environ.get("VERIFY_OBJECT_MIN", "0.5")) # confident other object, no cow: not_cow
MAX_SIDE = 1600
MAX_PIXELS = 40_000_000
MODEL_VERSION = "fasterrcnn_resnet50_fpn_v2-coco-default"
_lock = threading.Lock()


def interpret(cow_score, top_label, top_score, cow_min=COW_MIN, cow_weak=COW_WEAK, object_min=OBJECT_MIN):
    """cow_score: best 'cow' detection (0 if none). top_label/top_score: best non-cow detection."""
    if cow_score >= cow_min:
        return "cow"
    if cow_score >= cow_weak:
        return "uncertain"
    if top_label is not None and top_score >= object_min:
        return "not_cow"
    return "uncertain"  # nothing confident: never treated as proof of a cow


def register_verify(app, ctx):
    @app.post("/verify")
    def verify(photo: UploadFile = File(...)):
        if not ctx.USE_DETECTOR:
            raise HTTPException(503, "Detector disabled.")
        data = photo.file.read(ctx.MAX_IMAGE_BYTES + 1)
        if len(data) > ctx.MAX_IMAGE_BYTES:
            raise HTTPException(413, "Photo too large.")
        try:
            img = Image.open(io.BytesIO(data))
            if img.size[0] * img.size[1] > MAX_PIXELS:
                raise ValueError("too many pixels")
            img.load()
            img = ImageOps.exif_transpose(img).convert("RGB")
        except Exception:
            raise HTTPException(400, "Unreadable image.")
        if max(img.size) > MAX_SIDE:
            img.thumbnail((MAX_SIDE, MAX_SIDE))
        import torch
        try:
            with _lock:
                ctx._load_detector()
                with torch.no_grad():
                    out = ctx._detector([ctx._det_tf(img).to(ctx.device)])[0]
        except Exception:
            raise HTTPException(503, "Detector failed.")
        cow_score, top_label, top_score = 0.0, None, 0.0
        for lab, sc in zip(out["labels"].tolist(), out["scores"].tolist()):
            name = ctx._det_cats[lab]
            if name == "cow":
                cow_score = max(cow_score, sc)
            elif sc > top_score:
                top_label, top_score = name, sc
        status = interpret(cow_score, top_label, top_score)
        return {
            "status": status,
            "cowScore": round(cow_score, 4),
            "topLabel": top_label,
            "topScore": round(top_score, 4),
            "score": round(cow_score if status == "cow" else top_score, 4),
            "thresholds": {"cowMin": COW_MIN, "cowWeak": COW_WEAK, "objectMin": OBJECT_MIN},
            "model": MODEL_VERSION,
        }
