import os
import threading

_lock = threading.Lock()
_model = None


def _cached_model():
    hub = os.path.join(os.environ.get("HF_HOME") or os.path.join(os.path.expanduser("~"), ".cache", "huggingface"), "hub")
    if not os.path.isdir(hub):
        return None
    for entry in sorted(os.listdir(hub)):
        if entry.startswith("models--Systran--faster-whisper"):
            return entry.split("--")[-1]
    return None


def available():
    if os.environ.get("RIVAL_STT", "").strip().lower() == "off":
        return False
    try:
        import faster_whisper  # noqa
    except ImportError:
        return False
    return _cached_model() is not None


def get_model():
    global _model
    with _lock:
        if _model is None:
            from faster_whisper import WhisperModel

            name = _cached_model()
            if name is None:
                raise RuntimeError("stt model not cached")
            _model = WhisperModel(name, device="cpu", compute_type="int8")
    return _model


def transcribe(audio_path):
    model = get_model()
    segments, info = model.transcribe(audio_path, language="ar", vad_filter=True)
    text = " ".join(s.text for s in segments).strip()
    duration = round(info.duration, 1) if info and info.duration else 0
    try:
        if os.path.exists(audio_path):
            os.remove(audio_path)
    except OSError:
        pass
    return {"text": text, "seconds": duration}


def preload():
    try:
        get_model()
        print("  " + "stt ready")
    except Exception as exc:
        print("  " + "stt preload failed: " + str(exc))
