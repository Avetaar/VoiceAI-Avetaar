import importlib.util
import os
import platform
import shutil
import socket
import subprocess
import sys
import threading
import webbrowser

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.join(ROOT, "backend")
REQUIREMENTS = os.path.join(ROOT, "RIVAL_requirements.txt")
MODULES = ["flask", "requests", "edge_tts", "faster_whisper", "cryptography"]


def bar():
    print("=" * 52)


def banner():
    bar()
    print("  VOICEAI AVETAAR — Avetaar · Rival")
    print("  https://t.me/RivalStudio  —  @Avetaar")
    bar()


def is_termux():
    return "termux" in os.environ.get("PREFIX", "").lower() or platform.system().lower() == "android"


def missing_modules():
    return [m for m in MODULES if importlib.util.find_spec(m) is None]


def install_dependencies():
    print(" Installing required packages (first run only) ...")
    subprocess.run([sys.executable, "-m", "pip", "install", "--upgrade", "pip"], capture_output=True)
    result = subprocess.run([sys.executable, "-m", "pip", "install", "-r", REQUIREMENTS])
    if result.returncode != 0:
        print(" Package install failed — check your internet connection and retry")
        sys.exit(1)


def ensure_ffmpeg():
    if shutil.which("ffmpeg"):
        return
    if is_termux():
        print(" Installing ffmpeg for phone audio formats ...")
        subprocess.run(["pkg", "install", "-y", "ffmpeg"])
    else:
        print(" ffmpeg not found — some phone audio formats may not transcribe")


def lan_ip():
    try:
        return socket.gethostbyname(socket.gethostname())
    except OSError:
        return "127.0.0.1"


def main():
    banner()
    missing = missing_modules()
    if missing:
        print(" Missing: " + ", ".join(missing))
        install_dependencies()
        if missing_modules():
            print(" Dependencies still missing — restart this file")
            sys.exit(1)
    else:
        print(" All packages ready")
    ensure_ffmpeg()

    sys.path.insert(0, BACKEND)
    import RIVAL_app
    import RIVAL_stt

    url = "https://" + lan_ip() + ":8000"
    print(" Preparing certificates and voice model ...")
    threading.Thread(target=RIVAL_stt.preload, daemon=True).start()

    bar()
    print("  Open this link in Chrome (any device on your network):")
    print()
    print("  " + url)
    print()
    print("  Copy the link, paste it in your browser, accept the")
    print("  security warning, then talk to Avetaar by voice or text.")
    bar()

    try:
        webbrowser.open(url)
    except Exception:
        pass

    RIVAL_app.serve()


if __name__ == "__main__":
    main()
