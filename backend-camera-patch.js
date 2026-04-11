(function () {
  const state = {
    latestFrame: null,
    polling: false,
  };

  async function fetchSnapshot() {
    try {
      const response = await fetch(`/backend-camera/snapshot.jpg?ts=${Date.now()}`, {
        cache: "no-store",
      });
      if (!response.ok) return;

      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = function () {
        if (typeof reader.result === "string" && reader.result.startsWith("data:image")) {
          state.latestFrame = reader.result;
        }
      };
      reader.readAsDataURL(blob);
    } catch (_error) {
      // Keep silent. Missing frame should never block chat.
    }
  }

  function startPolling() {
    if (state.polling) return;
    state.polling = true;
    fetchSnapshot();
    setInterval(fetchSnapshot, 1200);
  }

  function patchWebSocketSend() {
    const originalSend = WebSocket.prototype.send;
    WebSocket.prototype.send = function patchedSend(data) {
      let nextData = data;
      try {
        if (typeof data === "string" && state.latestFrame) {
          const payload = JSON.parse(data);
          if (
            payload &&
            ["text-input", "mic-audio-end", "ai-speak-signal"].includes(payload.type)
          ) {
            const images = Array.isArray(payload.images) ? payload.images.slice() : [];
            images.push({
              source: "camera",
              data: state.latestFrame,
              mime_type: "image/jpeg",
            });
            payload.images = images;
            nextData = JSON.stringify(payload);
          }
        }
      } catch (_error) {
        // Never break chat send path because of camera patching.
      }
      return originalSend.call(this, nextData);
    };
  }

  function start() {
    patchWebSocketSend();
    startPolling();
    window.__backendCameraPatch = state;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
