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
          if (payload && shouldAttachCamera(payload)) {
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

  function shouldAttachCamera(payload) {
    if (!payload || payload.type !== "text-input") return false;
    const text = typeof payload.text === "string" ? payload.text.toLowerCase() : "";
    if (!text) return false;

    return [
      "画面",
      "图片",
      "图里",
      "图中",
      "照片",
      "截图",
      "屏幕",
      "摄像头",
      "镜头",
      "视频",
      "看图",
      "看看",
      "看到",
      "看见",
      "看得见",
      "能看到",
      "能看见",
      "我在干嘛",
      "我在做什么",
      "我长什么样",
      "我手上",
      "我手里",
      "我拿着",
      "我拿了",
      "这个是什么",
      "这是什么",
      "这是啥",
      "what do you see",
      "what is in the image",
      "what's in the image",
      "what is on the screen",
      "what am i holding",
      "what is in my hand",
      "what's in my hand",
    ].some((keyword) => text.includes(keyword));
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
