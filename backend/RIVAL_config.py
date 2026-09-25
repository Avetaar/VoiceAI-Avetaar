import os

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")
CERT_DIR = os.path.join(ROOT_DIR, "backend", "certs")
PREVIEW_DIR = os.path.join(ROOT_DIR, "backend", "cache")
UPLOAD_DIR = os.path.join(ROOT_DIR, "backend", "uploads")

HOST = "0.0.0.0"
PORT = 8000

LLM_API = "https://gptrealtime2.ai/api/generate"
LLM_HEADERS = {"Content-Type": "application/json", "user-agent": "Mozilla/5.0"}
LLM_MODEL = os.environ.get("RIVAL_LLM_MODEL", "deepseek/deepseek-v3.2")

RIVAL_PROXY = os.environ.get("RIVAL_PROXY", "").strip()
PROXIES = dict.fromkeys(("http", "https"), "http://" + RIVAL_PROXY) if RIVAL_PROXY else None

VOICES = {
    "bassel": "ar-IQ-BasselNeural",
    "rana": "ar-IQ-RanaNeural",
    "salma": "ar-EG-SalmaNeural",
    "shakir": "ar-EG-ShakirNeural",
    "zariyah": "ar-SA-ZariyahNeural",
}
DEFAULT_VOICE = "bassel"
PREVIEW_SAMPLE = "هلا بيك، أنا إيفيتار، كيف أقدر أساعدك اليوم؟"

MAX_TURNS = 8

SYSTEM_PROMPT = (
    'أنت "إيفيتار" (Avetaar)، مساعد صوتي ودود. '
    "رد دائمًا باللهجة العراقية، بأسلوب طبيعي ومختصر — جملة إلى جملتين كحد أعلى. "
    'إذا سألوا عنك، قل أن اسمك "إيفيتار" وأنت صديق وصاحب المستخدم. '
    "لا تذكر أنك نموذج ذكاء اصطناعي. كن مباشرًا وواضحًا لأن ردك يُنطق بصوت."
)


def build_prompt(text, history):
    ctx = ""
    for turn in history:
        who = "إيفيتار: " if turn["role"] == "assistant" else "أنا: "
        ctx += who + turn["content"] + "\n"
    return (
        SYSTEM_PROMPT
        + "\n\nالمحادثة السابقة:\n"
        + (ctx or "(لا يوجد)")
        + "\n\nسؤالي الآن: "
        + text
    )
