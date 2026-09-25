import asyncio
import io

import edge_tts

import RIVAL_config


def synthesize(text, voice_key=None):
    voice_key = voice_key or RIVAL_config.DEFAULT_VOICE

    async def generate():
        voice = RIVAL_config.VOICES.get(voice_key, RIVAL_config.VOICES[RIVAL_config.DEFAULT_VOICE])
        buffer = io.BytesIO()
        async for chunk in edge_tts.Communicate(text, voice).stream():
            if chunk["type"] == "audio":
                buffer.write(chunk["data"])
        return buffer.getvalue()

    try:
        return asyncio.run(generate())
    except Exception:
        return b""
