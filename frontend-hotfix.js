(function () {
  const SAFE_VAD_SETTINGS = {
    positiveSpeechThreshold: 18,
    negativeSpeechThreshold: 8,
    redemptionFrames: 8,
  };

  function applySafeAudioSettings() {
    try {
      localStorage.setItem("vadSettings", JSON.stringify(SAFE_VAD_SETTINGS));
      localStorage.setItem("autoStopMic", JSON.stringify(true));
      localStorage.setItem("autoStartMicOn", JSON.stringify(true));
      localStorage.setItem("autoStartMicOnConvEnd", JSON.stringify(true));
    } catch (_error) {}
  }

  function muteBrowserAiAudio() {
    if (window.__codexAudioMutedPatchApplied) return;
    window.__codexAudioMutedPatchApplied = true;

    const OriginalAudio = window.Audio;
    window.Audio = function patchedAudio(...args) {
      const audio = new OriginalAudio(...args);
      audio.muted = true;
      audio.volume = 0;
      return audio;
    };
    window.Audio.prototype = OriginalAudio.prototype;
  }

  function boostLive2DMotion() {
    const managerGetter = window.getLive2DManager;
    if (typeof managerGetter !== "function") return;

    const manager = managerGetter.call(window);
    if (!manager || typeof manager.getModel !== "function") return;

    const model = manager.getModel(0);
    if (!model) return;

    if (!model.__codexTalkMotionBoosted && typeof model.startRandomMotion === "function") {
      const originalStartRandomMotion = model.startRandomMotion.bind(model);
      model.startRandomMotion = function patchedStartRandomMotion(group, priority, ...rest) {
        if (group === "Talk") {
          const boostedPriority =
            typeof window.PriorityForce !== "undefined"
              ? window.PriorityForce
              : priority;
          return originalStartRandomMotion(group, boostedPriority, ...rest);
        }
        return originalStartRandomMotion(group, priority, ...rest);
      };
      model.__codexTalkMotionBoosted = true;
    }

    const wavHandler = model._wavFileHandler;
    if (
      wavHandler &&
      !wavHandler.__codexLipSyncBoosted &&
      typeof wavHandler.update === "function"
    ) {
      const originalUpdate = wavHandler.update.bind(wavHandler);
      wavHandler.update = function patchedLipSyncUpdate(...args) {
        const result = originalUpdate(...args);
        if (typeof this._lastRms === "number") {
          const boosted = Math.max(this._lastRms * 2.8, this._lastRms + 0.08);
          this._lastRms = Math.min(6, boosted);
        }
        return result;
      };
      wavHandler.__codexLipSyncBoosted = true;
    }
  }

  function disableBrowserVideoCapture() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

    const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );

    navigator.mediaDevices.getUserMedia = function patchedGetUserMedia(constraints) {
      const wantsVideo =
        !!constraints &&
        typeof constraints === "object" &&
        !!constraints.video &&
        !constraints.audio;

      if (wantsVideo) {
        return Promise.reject(
          new Error("Browser video capture disabled: backend camera snapshot mode is active."),
        );
      }

      return originalGetUserMedia(constraints);
    };
  }

  function stopExistingVideoStreams() {
    const videos = document.querySelectorAll("video");
    for (const video of videos) {
      const stream = video.srcObject;
      if (stream && typeof stream.getTracks === "function") {
        for (const track of stream.getTracks()) {
          track.stop();
        }
      }
      try {
        video.srcObject = null;
      } catch (_error) {}
    }
  }

  function softenCameraUi() {
    const textMap = new Map([
      ["点击启动摄像头", "后端视觉已自动开启"],
      ["Click to start camera", "Backend vision is automatic"],
      ["点击停止摄像头", "后端视觉已自动开启"],
      ["Click to stop camera", "Backend vision is automatic"],
    ]);

    const elements = document.querySelectorAll("div, span, p");
    for (const el of elements) {
      const text = (el.textContent || "").trim();
      if (!textMap.has(text)) continue;
      el.textContent = textMap.get(text);
      const box = el.closest("div");
      if (box) {
        box.style.pointerEvents = "none";
        box.style.opacity = "0.65";
      }
    }
  }

  function patchBlackPanels() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const elements = document.body.querySelectorAll("*");

    for (const el of elements) {
      if (!(el instanceof HTMLElement)) continue;

      const rect = el.getBoundingClientRect();
      if (rect.width < vw * 0.28 || rect.height < vh * 0.35) continue;
      if (rect.left < vw * 0.35) continue;

      const style = window.getComputedStyle(el);
      const bg = style.backgroundColor || "";
      const hasBgImage =
        style.backgroundImage && style.backgroundImage !== "none";

      const blackLike =
        bg === "rgb(0, 0, 0)" ||
        bg === "rgba(0, 0, 0, 1)" ||
        bg === "rgba(0, 0, 0, 0.9)" ||
        bg === "rgba(0, 0, 0, 0.8)";

      if (blackLike && !hasBgImage) {
        el.style.backgroundColor = "transparent";
      }
    }
  }

  disableBrowserVideoCapture();
  muteBrowserAiAudio();
  applySafeAudioSettings();

  const observer = new MutationObserver(function () {
    applySafeAudioSettings();
    stopExistingVideoStreams();
    softenCameraUi();
    patchBlackPanels();
  });

  function start() {
    applySafeAudioSettings();
    stopExistingVideoStreams();
    softenCameraUi();
    patchBlackPanels();
    boostLive2DMotion();
    setInterval(patchBlackPanels, 300);
    setInterval(applySafeAudioSettings, 1000);
    setInterval(boostLive2DMotion, 1000);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
