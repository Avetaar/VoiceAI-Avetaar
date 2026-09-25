import os
import subprocess
import threading

_lock = threading.Lock()
_model = None


def get_model():
    global _model
    with _lock:
        if _model is None:
            from faster_whisper import WhisperModel

            _model = WhisperModel("tiny", device="cpu", compute_type="int8")
    return _model


def _to_wav(audio_path):
    wav = audio_path + ".wav"
    proc = subprocess.run(
        ["ffmpeg", "-y", "-i", audio_path, "-ar", "16000", "-ac", "1", wav],
        capture_output=True,
        timeout=40,
    )
    if proc.returncode == 0 and os.path.exists(wav):
        return wav
    return audio_path


def transcribe(audio_path):
    model = get_model()
    wav = _to_wav(audio_path)
    try:
        segments, info = model.transcribe(wav, language="ar", vad_filter=True)
        text = " ".join(s.text for s in segments).strip()
    except Exception:
        segments, info = model.transcribe(wav, language="ar")
        text = " ".join(s.text for s in segments).strip()
    duration = round(info.duration, 1) if info and info.duration else 0
    for path in (audio_path, wav):
        try:
            if os.path.exists(path):
                os.remove(path)
        except OSError:
            pass
    return {"text": text, "seconds": duration}


def preload():
    try:
        get_model()
        print("  " + "stt model ready")
    except Exception as exc:
        print("  " + "stt preload failed: " + str(exc))
