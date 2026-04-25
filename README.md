# Kiosk Frontend Patch Layer / Kiosk 前端补丁层

本目录保存 Raspberry Pi kiosk 使用的静态前端。

This directory contains the static frontend used by the Raspberry Pi kiosk.

它保留构建后的 Open-LLM-VTuber 前端资源，并为具身二次元萌宠原型增加运行时补丁：

It keeps the built Open-LLM-VTuber frontend assets and adds runtime patches for the embodied anime-pet prototype:

- `backend-camera-patch.js`: 只有明确视觉问题才附加后端快照。
- `backend-camera-patch.js`: only attaches backend snapshots for explicit visual questions.
- `emotion-fallback.js`: 在流式 TTS 分片期间保持表情状态稳定。
- `emotion-fallback.js`: keeps expression state stable across streamed TTS chunks.
- `eyes-overlay.js`: kiosk 可靠性所需的静态眼睛/表情兜底 UI。
- `eyes-overlay.js`: static eyes/expression fallback for kiosk reliability.
- `frontend-hotfix.js`: Raspberry Pi 麦克风、自动播放和 UI 稳定性补丁。
- `frontend-hotfix.js`: Raspberry Pi microphone, autoplay and UI stability patches.
- `index.html`: kiosk 入口，负责挂载补丁脚本。
- `index.html`: kiosk entrypoint wiring the patch scripts.

前端不拥有机器人行为。它只负责采集输入并渲染表情状态；ASR、视觉、OpenClaw、TTS 和硬件服务仍由后端负责。

The frontend should not own robot behavior. It captures input and renders expression state; the backend remains responsible for ASR, vision, OpenClaw, TTS and hardware services.
