# Kiosk Frontend Patch Layer

This directory contains the static frontend used by the Raspberry Pi kiosk.

It keeps the built Open-LLM-VTuber frontend assets and adds runtime patches for the embodied anime-pet prototype:

- `backend-camera-patch.js`: only attaches backend snapshots for explicit visual questions.
- `emotion-fallback.js`: keeps expression state stable across streamed TTS chunks.
- `eyes-overlay.js`: static eyes/expression fallback for kiosk reliability.
- `frontend-hotfix.js`: Raspberry Pi microphone, autoplay and UI stability patches.
- `index.html`: kiosk entrypoint wiring the patch scripts.

The frontend should not own robot behavior. It captures input and renders expression state; the backend remains responsible for ASR, vision, OpenClaw, TTS and hardware services.
