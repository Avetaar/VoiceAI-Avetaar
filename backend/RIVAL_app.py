import base64
import os
import sys
import threading
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, Response, jsonify, request, send_from_directory

import RIVAL_config
import RIVAL_cert
import RIVAL_llm
import RIVAL_sessions
import RIVAL_tts

app = Flask(__name__)


@app.after_request
def policy(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    return response


@app.get("/")
def index():
    return send_from_directory(RIVAL_config.FRONTEND_DIR, "RIVAL_index.html")


@app.get("/<path:p>")
def static_files(p):
    return send_from_directory(RIVAL_config.FRONTEND_DIR, p)


@app.get("/api/health")
def health():
    return jsonify({"ok": True})


@app.post("/api/session")
def session():
    return jsonify({"session": RIVAL_sessions.create()})


@app.get("/api/preview/<voice_key>")
def preview(voice_key):
    os.makedirs(RIVAL_config.PREVIEW_DIR, exist_ok=True)
    path = os.path.join(RIVAL_config.PREVIEW_DIR, voice_key + ".mp3")
    if not os.path.exists(path):
        audio = RIVAL_tts.synthesize(RIVAL_config.PREVIEW_SAMPLE, voice_key)
        if not audio:
            return Response(status=400)
        with open(path, "wb") as fh:
            fh.write(audio)
    with open(path, "rb") as fh:
        return Response(fh.read(), mimetype="audio/mpeg")


@app.post("/api/talk")
def talk():
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    sid = data.get("session") or "anon"
    voice_key = data.get("voice") or RIVAL_config.DEFAULT_VOICE
    if not text:
        return jsonify({"error": "empty message"}), 400
    history = RIVAL_sessions.history(sid)
    try:
        reply_text = RIVAL_llm.reply(text, history)
    except Exception as exc:
        return jsonify({"error": "llm: " + str(exc)}), 500
    if not reply_text:
        return jsonify({"error": "empty reply"}), 500
    RIVAL_sessions.remember(sid, text, reply_text)
    audio = RIVAL_tts.synthesize(reply_text, voice_key)
    out = {"text": reply_text, "voice": voice_key}
    if audio:
        out["audio"] = base64.b64encode(audio).decode()
        out["mime"] = "audio/mpeg"
    return jsonify(out)


def serve():
    cert, key = RIVAL_cert.ensure_certs()
    app.run(host=RIVAL_config.HOST, port=RIVAL_config.PORT, ssl_context=(cert, key))


if __name__ == "__main__":
    serve()
