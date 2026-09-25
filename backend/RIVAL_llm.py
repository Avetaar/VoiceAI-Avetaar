import json
import os
import random
import string

import requests

import RIVAL_config

TOKEN_CACHE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".cache", "RIVAL_rewind.json")

BASE = "https://api.rewind.ai/v1"
UA = "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36"


def _rnd(n):
    return "".join(random.choices(string.ascii_letters + string.digits, k=n))


def _signup():
    email = _rnd(10) + "@gmail.com"
    pw = _rnd(4) + "A1" + _rnd(4) + "a"
    r = requests.post(
        BASE + "/auth/signup",
        json={"email": email, "password": pw},
        headers={"Content-Type": "application/json", "User-Agent": UA},
        timeout=30,
        proxies=RIVAL_config.PROXIES,
    )
    r.raise_for_status()
    data = r.json()
    tok = data["accessToken"]
    uid = data["user"]["id"]
    os.makedirs(os.path.dirname(TOKEN_CACHE), exist_ok=True)
    with open(TOKEN_CACHE, "w", encoding="utf-8") as fh:
        json.dump({"token": tok, "user": uid}, fh)
    return tok, uid


def get_session():
    try:
        with open(TOKEN_CACHE, encoding="utf-8") as fh:
            saved = json.load(fh)
        if saved.get("token") and saved.get("user"):
            return saved["token"], saved["user"]
    except (OSError, ValueError):
        pass
    return _signup()


def _headers(tok, uid):
    return {
        "Authorization": "Bearer " + tok,
        "x-user-id": uid,
        "Content-Type": "application/json",
        "User-Agent": UA,
    }


def _rewind(text, history):
    prompt = RIVAL_config.build_prompt(text, history)
    tok, uid = get_session()
    model = RIVAL_config.LLM_MODEL
    payload = {"messages": [{"role": "system", "content": prompt}], "model": model, "stream": False}
    for _ in range(2):
        r = requests.post(BASE + "/chat/completions/", json=payload, headers=_headers(tok, uid), timeout=90, proxies=RIVAL_config.PROXIES)
        if r.status_code in (401, 403, 429):
            tok, uid = _signup()
            continue
        r.raise_for_status()
        data = r.json()
        choices = data.get("choices") or []
        if choices and (choices[0].get("message") or {}).get("content"):
            return choices[0]["message"]["content"].strip()
    return ""


def _gptrealtime(text, history):
    prompt = RIVAL_config.build_prompt(text, history)
    response = requests.post(
        RIVAL_config.LLM_API,
        headers=RIVAL_config.LLM_HEADERS,
        json={"prompt": prompt, "demo": False},
        timeout=60,
        proxies=RIVAL_config.PROXIES,
    )
    payload = response.json()
    return (payload.get("transcript") or "").strip()


def reply(text, history):
    out = ""
    for fn in (_rewind, _gptrealtime):
        try:
            out = fn(text, history)
            if out:
                return out
        except Exception:
            continue
    if not out:
        raise RuntimeError("llm: no provider responded")
    return out
