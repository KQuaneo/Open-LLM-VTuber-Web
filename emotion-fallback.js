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
    root: null,
    label: null,
    emotion: "neutral",
    emotionUntil: 0,
    speakingUntil: 0,
    thinkingUntil: 0,
    blinkTimer: 0,
  };

  function nowMs() {
    return Date.now();
  }

  function mapEmotion(value) {
    return EMOTION_ALIAS[String(value || "neutral").toLowerCase()] || "neutral";
  }

  function estimateAudioDurationMs(payload) {
    const slice = Number(payload && payload.slice_length) || 20;
    const volumes = Array.isArray(payload && payload.volumes) ? payload.volumes.length : 0;
    if (volumes > 0) return Math.max(1200, volumes * slice);
    return 2200;
  }

  function currentEmotion() {
    const now = nowMs();
    if (now < state.speakingUntil) return state.emotion;
    if (now < state.thinkingUntil) return "thinking";
    if (now < state.emotionUntil) return state.emotion;
    return "neutral";
  }

  function applyEmotion() {
    if (!state.root) return;
    const emotion = currentEmotion();
    state.root.dataset.emotion = emotion;
    if (state.label) {
      state.label.textContent = String(emotion).toUpperCase();
    }
  }

  function setEmotion(emotion, durationMs) {
    state.emotion = mapEmotion(emotion);
    state.emotionUntil = nowMs() + (durationMs || 1800);
    state.thinkingUntil = 0;
    applyEmotion();
  }

  function setThinking(durationMs) {
    state.thinkingUntil = nowMs() + (durationMs || 2600);
    applyEmotion();
  }

  function setSpeaking(emotion, durationMs) {
    state.emotion = mapEmotion(emotion || "happy");
    state.thinkingUntil = 0;
    state.speakingUntil = nowMs() + (durationMs || 2200);
    state.emotionUntil = state.speakingUntil;
    applyEmotion();
  }

  function blinkOnce() {
    if (!state.root) return;
    state.root.classList.add("is-blinking");
    window.clearTimeout(state.blinkTimer);
    state.blinkTimer = window.setTimeout(function () {
      if (state.root) {
        state.root.classList.remove("is-blinking");
      }
    }, 180);
  }

  function handlePayload(payload) {
    if (!payload || typeof payload !== "object") return;

    if (payload.type === "control") {
      if (payload.text === "conversation-chain-start") {
        setThinking(3200);
      } else if (payload.text === "conversation-chain-end") {
        setEmotion("neutral", 800);
      }
      return;
    }

    if (payload.type === "full-text" && payload.text === "Thinking...") {
      setThinking(3200);
      return;
    }

    if (payload.type === "user-input-transcription") {
      setEmotion("surprised", 1000);
      blinkOnce();
      return;
    }

    if (payload.type === "audio") {
      const emotionTags =
        payload.actions && Array.isArray(payload.actions.emotion_tags)
          ? payload.actions.emotion_tags
          : [];
      const emotion = emotionTags.length ? emotionTags[emotionTags.length - 1] : "happy";
      setSpeaking(emotion, estimateAudioDurationMs(payload));
      blinkOnce();
    }
  }

  function patchWebSocket() {
    if (window.__codexFallbackEmotionSocketPatched) return;
    window.__codexFallbackEmotionSocketPatched = true;

    const NativeWebSocket = window.WebSocket;
    function WrappedWebSocket(url, protocols) {
      const socket =
        protocols === undefined ? new NativeWebSocket(url) : new NativeWebSocket(url, protocols);
      socket.addEventListener("message", function (event) {
        if (typeof event.data !== "string") return;
        try {
          handlePayload(JSON.parse(event.data));
        } catch (_error) {}
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

  function startIdleBlink() {
    function schedule() {
      const delay = 1800 + Math.random() * 2600;
      window.setTimeout(function () {
        blinkOnce();
        applyEmotion();
        schedule();
      }, delay);
    }
    schedule();
  }

  function startEmotionRefresh() {
    window.setInterval(applyEmotion, 300);
  }

  function start() {
    state.root = document.getElementById("codex-eye-fallback");
    state.label = document.getElementById("codex-emotion-label");
    if (!state.root) return;
    state.root.dataset.emotion = "neutral";
    if (state.label) state.label.textContent = "NEUTRAL";
    patchWebSocket();
    startIdleBlink();
    startEmotionRefresh();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
