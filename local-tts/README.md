# Local Coqui Narration Environment

This path uses the locked manuscript and existing chapter/segment/routing manifests. It does not re-extract the publication PDF or silently replace unresolved dialogue with a narrator.

Installed workstation baseline:

- Python 3.13
- CUDA-enabled PyTorch
- Coqui TTS 0.27.5
- Transformers 4.57.6 compatibility pin
- FFmpeg 9.0
- NVIDIA RTX 3070

The next production gate is a licensed/approved multi-speaker model and stable speaker assignment for every principal and ensemble role. No model output may be called final until dialogue routing, pronunciation, signal treatment, text parity, loudness, clipping, checksum, and human listening QA pass.

Run the environment check from a fresh shell after installation:

```powershell
.venv-local-tts\Scripts\python.exe local-tts\verify_environment.py
```
