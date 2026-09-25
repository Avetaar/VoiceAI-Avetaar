import threading
import uuid
from collections import deque

import RIVAL_config

_lock = threading.Lock()
_sessions = {}


def _session(sid):
    return _sessions.setdefault(sid, deque(maxlen=RIVAL_config.MAX_TURNS * 2))


def create():
    sid = "s" + uuid.uuid4().hex[:12]
    with _lock:
        _session(sid)
    return sid


def history(sid):
    with _lock:
        return list(_session(sid))


def remember(sid, user_text, assistant_text):
    with _lock:
        h = _session(sid)
        h.append({"role": "user", "content": user_text})
        h.append({"role": "assistant", "content": assistant_text})
