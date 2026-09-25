import importlib.util
import os
import platform
import socket
import subprocess
import sys
import webbrowser

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.join(ROOT, "backend")
REQUIREMENTS = os.path.join(ROOT, "RIVAL_requirements.txt")
MODULES = ["flask", "requests", "edge_tts", "cryptography"]

RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"
PURPLE = "\033[38;5;141m"
CYAN = "\033[38;5;51m"
GREEN = "\033[38;5;42m"
YELLOW = "\033[38;5;214m"
WHITE = "\033[38;5;255m"


def banner():
    print()
    print(PURPLE + "  " + "═" * 54 + RESET)
    print("  " + BOLD + WHITE + "⚡ VOICEAI AVETAAR" + RESET + "  " + DIM + "· assistant vocal · Iraqi dialect")
    print("  " + WHITE + "Avetaar" + RESET + "   " + CYAN + "Rival" + RESET + "   " + DIM + "t.me/RivalStudio   @Avetaar")
    print(PURPLE + "  " + "═" * 54 + RESET)


def ok(text):
    print("  " + GREEN + "✔ " + RESET + text)


def warn(text):
    print("  " + YELLOW + "⚠ " + RESET + text)


def is_termux():
    return "termux" in os.environ.get("PREFIX", "").lower() or platform.system().lower() == "android"


def termux_prep():
    if is_termux():
        print("  " + DIM + "Termux — system preparation ...")
        subprocess.run(["pkg", "install", "-y", "python-pip"])


def missing_modules():
    return [m for m in MODULES if importlib.util.find_spec(m) is None]


def install_dependencies():
    print("  " + DIM + "Installing missing packages ...")
    subprocess.run([sys.executable, "-m", "pip", "install", "--upgrade", "pip"], capture_output=True)
    result = subprocess.run([sys.executable, "-m", "pip", "install", "-r", REQUIREMENTS])
    if result.returncode != 0:
        warn("Installation failed — check internet and retry")
        sys.exit(1)


def lan_ip():
    try:
        return socket.gethostbyname(socket.gethostname())
    except OSError:
        return "127.0.0.1"


def link_block(url):
    print()
    print(CYAN + "  " + "─" * 54 + RESET)
    print("  " + BOLD + GREEN + "Avetaar Live ▶" + RESET)
    print()
    print("   " + BOLD + CYAN + url + RESET)
    print()
    print("  " + DIM + "انسخ الرابط وفتحه بالمتصفح (كروم) على أي جهاز بالشبكة،")
    print("  " + DIM + "قبل تنبيه الأمان، وتكلم مع Avetaar — صوت أو كتابة.")
    print(CYAN + "  " + "─" * 54 + RESET)


def main():
    if os.name == "nt":
        os.system("")
    banner()
    termux_prep()
    if missing_modules():
        install_dependencies()
        if missing_modules():
            warn("المكتبات غير مهيأة — أعد تشغيل الملف")
            sys.exit(1)
    else:
        ok("المكتبات جاهزة")

    sys.path.insert(0, BACKEND)
    import RIVAL_app

    url = "https://" + lan_ip() + ":8000"
    print("  " + DIM + "تجهيز الشهادة ...")

    link_block(url)

    try:
        webbrowser.open(url)
    except Exception:
        pass

    RIVAL_app.serve()


if __name__ == "__main__":
    main()
