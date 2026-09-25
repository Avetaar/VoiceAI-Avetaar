import requests

import RIVAL_config


def reply(text, history):
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
