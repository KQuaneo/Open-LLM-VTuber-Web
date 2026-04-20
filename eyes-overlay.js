(function () {
  const EMOTION_ALIAS = {
    joy: "happy",
    happy: "happy",
    smirk: "happy",
    neutral: "neutral",
    sadness: "sad",
    sad: "sad",
    anger: "angry",
    angry: "angry",
    surprise: "surprised",
    surprised: "surprised",
    fear: "surprised",
    thinking: "thinking",
    sleepy: "sleepy",
  };

  const state = {
    canvas: null,
    ctx: null,
    fallback: null,
    renderHealthy: false,
    dpr: 1,
    speakingUntil: 0,
    thinkingUntil: 0,
    emotionUntil: 0,
    speechEmotion: "happy",
    currentEmotion: "neutral",
    pupilX: 0,
    pupilY: 0,
    targetPupilX: 0,
    targetPupilY: 0,
    blink: 0,
    nextBlinkAt: 0,
    nextMicroAt: 0,
    width: 200,
    height: 160,
    gap: 144,
    lidTop: 0.03,
    lidBottom: 0.02,
    brow: 0,
    angle: 0,
    pupilSize: 35,
  };

  function mapEmotion(tag) {
    return EMOTION_ALIAS[String(tag || "neutral").toLowerCase()] || "neutral";
  }

  function lerp(current, target, speed) {
    return current + (target - current) * speed;
  }

  function nowMs() {
    return Date.now();
  }

  function getPreset(emotion) {
    switch (emotion) {
      case "happy":
        return { width: 204, height: 168, gap: 142, lidTop: 0.08, lidBottom: 0.44, brow: -8, angle: 0, pupilSize: 38 };
      case "sad":
        return { width: 194, height: 148, gap: 146, lidTop: 0.24, lidBottom: 0.08, brow: 18, angle: 10, pupilSize: 38 };
      case "angry":
        return { width: 208, height: 146, gap: 134, lidTop: 0.22, lidBottom: 0.12, brow: -22, angle: -12, pupilSize: 28 };
      case "surprised":
        return { width: 188, height: 194, gap: 150, lidTop: 0.02, lidBottom: 0.02, brow: 18, angle: 0, pupilSize: 20 };
      case "thinking":
        return { width: 198, height: 154, gap: 144, lidTop: 0.16, lidBottom: 0.08, brow: -4, angle: 0, pupilSize: 33 };
      case "sleepy":
        return { width: 206, height: 120, gap: 144, lidTop: 0.62, lidBottom: 0.05, brow: 6, angle: 0, pupilSize: 36 };
      default:
        return { width: 200, height: 160, gap: 144, lidTop: 0.03, lidBottom: 0.02, brow: 0, angle: 0, pupilSize: 35 };
    }
  }

  function activeEmotion() {
    const now = nowMs();
    if (now < state.speakingUntil) return state.speechEmotion;
    if (now < state.thinkingUntil) return "thinking";
    if (now < state.emotionUntil) return state.currentEmotion;
    return "neutral";
  }

  function setEmotion(emotion, durationMs) {
    state.currentEmotion = mapEmotion(emotion);
    state.emotionUntil = nowMs() + (durationMs || 1800);
  }

  function markThinking(durationMs) {
    state.thinkingUntil = nowMs() + (durationMs || 2600);
    setEmotion("thinking", durationMs || 2600);
  }

  function markSpeaking(durationMs, emotion) {
    state.speechEmotion = mapEmotion(emotion || "happy");
    state.speakingUntil = Math.max(state.speakingUntil, nowMs() + (durationMs || 2200));
    setEmotion(state.speechEmotion, durationMs || 2200);
  }

  function estimateDuration(payload) {
    const slice = Number(payload && payload.slice_length) || 20;
    const volumes = Array.isArray(payload && payload.volumes) ? payload.volumes.length : 0;
    return volumes > 0 ? Math.max(1200, slice * volumes) : 2200;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function resize() {
    if (!state.canvas) return;
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.canvas.width = Math.floor(window.innerWidth * state.dpr);
    state.canvas.height = Math.floor(window.innerHeight * state.dpr);
  }

  function updateMotion(timestamp) {
    if (timestamp >= state.nextMicroAt) {
      const emotion = activeEmotion();
      if (emotion === "thinking") {
        state.targetPupilX = 16;
        state.targetPupilY = -10;
      } else if (emotion === "sad") {
        state.targetPupilX = 0;
        state.targetPupilY = 12;
      } else if (emotion === "angry") {
        state.targetPupilX = 6;
        state.targetPupilY = 0;
      } else {
        state.targetPupilX = (Math.random() - 0.5) * 18;
        state.targetPupilY = (Math.random() - 0.5) * 12;
      }
      state.nextMicroAt = timestamp + 700 + Math.random() * 1200;
    }

    if (timestamp >= state.nextBlinkAt) {
      state.blink = 1;
      state.nextBlinkAt = timestamp + 1800 + Math.random() * 2400;
    }

    state.blink = lerp(state.blink, 0, 0.24);
    if (state.blink < 0.01) state.blink = 0;

    state.pupilX = lerp(state.pupilX, state.targetPupilX, 0.14);
    state.pupilY = lerp(state.pupilY, state.targetPupilY, 0.14);

    const preset = getPreset(activeEmotion());
    state.width = lerp(state.width, preset.width, 0.12);
    state.height = lerp(state.height, preset.height, 0.12);
    state.gap = lerp(state.gap, preset.gap, 0.12);
    state.lidTop = lerp(state.lidTop, preset.lidTop, 0.14);
    state.lidBottom = lerp(state.lidBottom, preset.lidBottom, 0.14);
    state.brow = lerp(state.brow, preset.brow, 0.12);
    state.angle = lerp(state.angle, preset.angle, 0.12);
    state.pupilSize = lerp(state.pupilSize, preset.pupilSize, 0.12);
  }

  function drawBackground(ctx, width, height, t) {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#08101d");
    grad.addColorStop(0.5, "#10192d");
    grad.addColorStop(1, "#1c2742");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const pulse = 0.2 + 0.03 * Math.sin(t * 0.8);
    ctx.save();
    ctx.globalAlpha = pulse;
    const halo = ctx.createRadialGradient(width / 2, height * 0.42, 40, width / 2, height * 0.42, width * 0.34);
    halo.addColorStop(0, "rgba(100, 214, 255, 0.95)");
    halo.addColorStop(1, "rgba(100, 214, 255, 0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(190, 220, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let y = 0; y < height; y += 6) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(120, 170, 220, 0.18)";
    ctx.lineWidth = 2;
    roundRect(ctx, 26, 24, width - 52, height - 48, 24);
    ctx.stroke();
    ctx.strokeStyle = "rgba(40, 63, 95, 0.95)";
    ctx.lineWidth = 1;
    roundRect(ctx, 40, 38, width - 80, height - 76, 18);
    ctx.stroke();
    ctx.restore();
  }

  function drawEye(ctx, x, y, isLeft, t) {
    const blink = state.blink;
    const breath = 1 + Math.sin(t * 2.5) * 0.015;
    const w = state.width * breath;
    const h = state.height * breath * (1 - blink * 0.82);
    const angle = (isLeft ? 1 : -1) * state.angle * Math.PI / 180;
    const pupilX = (isLeft ? 1 : -1) * state.pupilX;
    const pupilY = state.pupilY;
    const topClosure = Math.min(0.95, state.lidTop + blink * 0.9);
    const bottomClosure = Math.min(0.8, state.lidBottom + blink * 0.15);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const eyePath = new Path2D();
    eyePath.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);

    const glow = ctx.createRadialGradient(0, 0, w * 0.08, 0, 0, w * 0.82);
    glow.addColorStop(0, "rgba(76, 224, 255, 0.18)");
    glow.addColorStop(1, "rgba(76, 224, 255, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(-w, -w, w * 2, w * 2);

    ctx.fillStyle = "#f3f7ff";
    ctx.fill(eyePath);
    ctx.strokeStyle = "rgba(173, 183, 210, 0.75)";
    ctx.lineWidth = 4;
    ctx.stroke(eyePath);

    ctx.save();
    ctx.clip(eyePath);

    const irisX = pupilX * 0.75;
    const irisY = pupilY * 0.75;
    const irisR = state.pupilSize * 2.05;
    const iris = ctx.createRadialGradient(irisX - irisR * 0.16, irisY - irisR * 0.28, irisR * 0.18, irisX, irisY, irisR);
    iris.addColorStop(0, "#c2f6ff");
    iris.addColorStop(0.2, "#57d1ff");
    iris.addColorStop(0.62, "#3467d7");
    iris.addColorStop(1, "#091530");
    ctx.fillStyle = iris;
    ctx.beginPath();
    ctx.arc(irisX, irisY, irisR, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(169, 233, 255, 0.28)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 14; i += 1) {
      const ray = (Math.PI * 2 * i) / 14 + t * 0.08;
      const inner = irisR * 0.28;
      const outer = irisR * 0.82;
      ctx.beginPath();
      ctx.moveTo(irisX + Math.cos(ray) * inner, irisY + Math.sin(ray) * inner);
      ctx.lineTo(irisX + Math.cos(ray) * outer, irisY + Math.sin(ray) * outer);
      ctx.stroke();
    }

    ctx.fillStyle = "#090d18";
    ctx.beginPath();
    ctx.arc(irisX, irisY, state.pupilSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
    ctx.beginPath();
    ctx.arc(irisX - state.pupilSize * 0.46, irisY - state.pupilSize * 0.5, state.pupilSize * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(205, 233, 255, 0.85)";
    ctx.beginPath();
    ctx.arc(irisX + state.pupilSize * 0.42, irisY + state.pupilSize * 0.44, state.pupilSize * 0.14, 0, Math.PI * 2);
    ctx.fill();

    const topY = -h / 2 + h * topClosure;
    const curveDepth = h * 0.13;
    ctx.fillStyle = "#09101d";
    ctx.beginPath();
    ctx.moveTo(-w, -h);
    ctx.lineTo(w, -h);
    ctx.lineTo(w * 0.6, topY - curveDepth);
    ctx.quadraticCurveTo(0, topY + curveDepth, -w * 0.6, topY - curveDepth);
    ctx.closePath();
    ctx.fill();

    if (bottomClosure > 0.01) {
      const bottomY = h / 2 - h * bottomClosure * 0.7;
      ctx.beginPath();
      ctx.moveTo(-w, h);
      ctx.lineTo(w, h);
      ctx.lineTo(w * 0.58, bottomY + curveDepth * 0.1);
      ctx.quadraticCurveTo(0, bottomY - curveDepth, -w * 0.58, bottomY + curveDepth * 0.1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.strokeStyle = "#151927";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-w * 0.62, topY - curveDepth * 0.45);
    ctx.quadraticCurveTo(0, topY + curveDepth * 0.95, w * 0.62, topY - curveDepth * 0.45);
    ctx.stroke();

    if (blink < 0.88) {
      const lashDir = isLeft ? -1 : 1;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(w * 0.48 * lashDir, topY - curveDepth * 0.18);
      ctx.lineTo(w * 0.68 * lashDir, topY - curveDepth * 0.92);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w * 0.18 * lashDir, topY + curveDepth * 0.1);
      ctx.lineTo(w * 0.32 * lashDir, topY - curveDepth * 0.66);
      ctx.stroke();
    }

    if (bottomClosure > 0.01) {
      const bottomY = h / 2 - h * bottomClosure * 0.7;
      ctx.strokeStyle = "#192334";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-w * 0.52, bottomY + curveDepth * 0.1);
      ctx.quadraticCurveTo(0, bottomY - curveDepth * 0.8, w * 0.52, bottomY + curveDepth * 0.1);
      ctx.stroke();
    }

    const browY = -h * 0.72 + state.brow * 0.9;
    const browTilt = state.brow * (isLeft ? 1 : -1) * 0.18;
    ctx.strokeStyle = "rgba(14, 18, 28, 0.98)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-w * 0.42, browY + browTilt);
    ctx.lineTo(w * 0.42, browY - browTilt);
    ctx.stroke();
    ctx.strokeStyle = "rgba(110, 173, 255, 0.45)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  function render(timestamp) {
    if (!state.ctx || !state.canvas) return;
    try {
      updateMotion(timestamp);

      const ctx = state.ctx;
      const dpr = state.dpr;
      const width = state.canvas.width / dpr;
      const height = state.canvas.height / dpr;
      const t = timestamp / 1000;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
      ctx.scale(dpr, dpr);

      drawBackground(ctx, width, height, t);
      drawEye(ctx, width / 2 - state.gap, height / 2, true, t);
      drawEye(ctx, width / 2 + state.gap, height / 2, false, t);

      state.renderHealthy = true;
      window.requestAnimationFrame(render);
    } catch (error) {
      console.error("Eyes overlay render failed:", error);
      state.renderHealthy = false;
      if (state.canvas) {
        state.canvas.style.display = "none";
      }
      if (state.fallback) {
        state.fallback.style.display = "flex";
      }
    }
  }

  function handleMessage(raw) {
    if (typeof raw !== "string") return;
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (_error) {
      return;
    }
    if (!payload || typeof payload !== "object") return;

    if (payload.type === "control") {
      if (payload.text === "conversation-chain-start") markThinking(3000);
      if (payload.text === "conversation-chain-end") setEmotion("neutral", 900);
      return;
    }
    if (payload.type === "full-text" && payload.text === "Thinking...") {
      markThinking(3000);
      return;
    }
    if (payload.type === "user-input-transcription") {
      setEmotion("surprised", 900);
      return;
    }
    if (payload.type === "audio") {
      const tags = payload.actions && Array.isArray(payload.actions.emotion_tags) ? payload.actions.emotion_tags : [];
      const emotion = tags.length ? tags[tags.length - 1] : "happy";
      markSpeaking(estimateDuration(payload), emotion);
    }
  }

  function patchWebSocket() {
    if (window.__codexEyesSocketPatched) return;
    window.__codexEyesSocketPatched = true;
    const NativeWebSocket = window.WebSocket;

    function WrappedWebSocket(url, protocols) {
      const socket = protocols === undefined ? new NativeWebSocket(url) : new NativeWebSocket(url, protocols);
      socket.addEventListener("message", function (event) {
        handleMessage(event.data);
      });
      return socket;
    }

    WrappedWebSocket.prototype = NativeWebSocket.prototype;
    Object.setPrototypeOf(WrappedWebSocket, NativeWebSocket);
    WrappedWebSocket.CONNECTING = NativeWebSocket.CONNECTING;
    WrappedWebSocket.OPEN = NativeWebSocket.OPEN;
    WrappedWebSocket.CLOSING = NativeWebSocket.CLOSING;
    WrappedWebSocket.CLOSED = NativeWebSocket.CLOSED;
    window.WebSocket = WrappedWebSocket;
  }

  function start() {
    const canvas = document.getElementById("codex-eye-canvas");
    if (!canvas) return;
    state.canvas = canvas;
    state.ctx = canvas.getContext("2d");
    state.fallback = document.getElementById("codex-eye-fallback");
    if (state.fallback) {
      state.fallback.style.display = "flex";
    }
    if (state.canvas) {
      state.canvas.style.display = "block";
    }
    state.nextBlinkAt = performance.now() + 1600;
    state.nextMicroAt = performance.now() + 600;
    resize();
    patchWebSocket();
    window.addEventListener("resize", resize, { passive: true });
    window.requestAnimationFrame(render);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
