from __future__ import annotations

import json
import shutil

import torch
import TTS


report = {
    "torch_version": torch.__version__,
    "coqui_version": TTS.__version__,
    "cuda_available": torch.cuda.is_available(),
    "cuda_device": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
    "ffmpeg_available": shutil.which("ffmpeg") is not None,
    "production_ready": torch.cuda.is_available() and shutil.which("ffmpeg") is not None,
}

print(json.dumps(report, indent=2))
raise SystemExit(0 if report["production_ready"] else 1)
