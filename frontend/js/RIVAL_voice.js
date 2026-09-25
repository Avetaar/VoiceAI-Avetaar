import { state, ensureAudioCtx, toast } from "./RIVAL_state.js";
import { addText, voiceWidget, driveMouth } from "./RIVAL_chat.js";
import { face } from "./RIVAL_face.js";
import { aiReply, sttBlob } from "./RIVAL_api.js";

const micBtn = document.getElementById("micBtn");
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const BROWSER_MODE = !!SR;

async function sendUserText(q) {
  state.inFlight = true;
  await aiReply(q);
  state.inFlight = false;
}

// ---------------- Mode A: browser STT (zero download) ----------------
let bRec = null;
let bActive = false;
let bFinal = "";
let bBubble = null;
let bText = null;

function bSend() {
  const q = bFinal.trim();
  bFinal = "";
  if (bText) {
    bText.classList.remove("pending");
  }
  bBubble = null;
  bText = null;
  if (!q) {
    toast("ما سمعت كلامك — سجّل ثانية");
    face.setState("");
    return;
  }
  sendUserText(q);
}

function bStart() {
  if (state.inFlight) {
    toast("لحظة — بانتظار الرد");
    return;
  }
  bActive = true;
  bFinal = "";
  try {
    bRec.start();
  } catch {
    bActive = false;
    return;
  }
  micBtn.classList.add("listening");
  face.setState("تكلّم — وأنا أسمعك", true);
}

function bStop() {
  bActive = false;
  try {
    bRec.stop();
  } catch {
    bRec = null;
  }
  micBtn.classList.remove("listening");
  bSend();
}

function wireBrowser() {
  bRec = new SR();
  bRec.lang = "ar";
  bRec.continuous = true;
  bRec.interimResults = true;
  bRec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) bFinal += r[0].transcript + " ";
      else interim += r[0].transcript;
    }
    const all = (bFinal + interim).trim();
    if (!bBubble) {
      const c = addText("you", "");
      bBubble = c.bubble;
      bText = c.t;
      bText.classList.add("pending");
    }
    bText.textContent = all || "⏳ أسمعك…";
    face.setState("أسمع كلامك…", true);
  };
  bRec.onend = () => {
    if (bActive) {
      try {
        bRec.start();
      } catch {
        bActive = false;
        micBtn.classList.remove("listening");
      }
    }
  };
  bRec.onerror = (e) => {
    if (e.error === "not-allowed") {
      toast("ماكو إذن مايك — شغّل الأذن من المتصفح");
      bActive = false;
      micBtn.classList.remove("listening");
    }
  };
  micBtn.onclick = () => {
    if (bActive) bStop();
    else bStart();
  };
}

// ---------------- Mode B: server STT (MediaRecorder + /api/stt) ----------------
function pickMime() {
  const opts = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  if (!window.MediaRecorder) return "";
  for (const o of opts) if (MediaRecorder.isTypeSupported(o)) return o;
  return "";
}

async function ensureStream() {
  ensureAudioCtx();
  if (state.mediaStream) return state.mediaStream;
  state.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return state.mediaStream;
}

function startRec() {
  state.recChunks = [];
  state.recActive = true;
  state.recorder = new MediaRecorder(state.mediaStream, pickMime() ? { mimeType: pickMime() } : {});
  state.recorder.ondataavailable = (e) => {
    if (e.data && e.data.size) state.recChunks.push(e.data);
  };
  state.recorder.start(250);
}

function stopRec() {
  try {
    if (state.recorder && state.recorder.state !== "inactive") state.recorder.stop();
  } catch {
    state.recorder = null;
  }
  state.recActive = false;
}

function stopVad() {
  if (state.vadTimer) clearInterval(state.vadTimer);
  state.vadTimer = null;
}

async function sendBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const { bubble, t } = addText("you", "");
  t.textContent = "⏳ أفهم كلامك…";
  t.classList.add("pending");
  const userAudio = voiceWidget(bubble, "رسالتك الصوتية", url, false);
  try {
    const sd = await sttBlob(blob, fileName);
    const q = (sd.text || "").trim();
    if (sd.error) throw new Error(sd.error);
    if (!q) {
      t.textContent = "⚠️ ما فهمت كلامك — حاول أوضح أو اكتب";
      t.classList.remove("pending");
      face.setState("");
      return;
    }
    t.textContent = q;
    t.classList.remove("pending");
    await sendUserText(q);
  } catch (err) {
    t.textContent = "⚠️ " + err.message;
    t.classList.remove("pending");
    face.setState("");
  }
  driveMouth(userAudio, face.setSpeaking);
}

async function finalizeRecording() {
  stopVad();
  stopRec();
  micBtn.classList.remove("listening");
  if (state.inFlight) {
    toast("لحظة — بانتظار الرد");
    return;
  }
  await new Promise((r) => setTimeout(r, 450));
  const blob = new Blob(state.recChunks, { type: pickMime() || "audio/webm" });
  state.recChunks = [];
  if (blob.size < 2000) {
    toast("ما سمعت كلامك — سجّل ثانية");
    face.setState("بانتظار كلامك");
    return;
  }
  face.setState("أفهم كلامك…", true);
  await sendBlob(blob, "rec.webm");
}

function wireServer() {
  micBtn.onclick = () => {
    if (state.recActive) {
      finalizeRecording();
      return;
    }
    ensureStream()
      .then(() => {
        state.recT0 = Date.now();
        startRec();
        micBtn.classList.add("listening");
        face.setState("تكلّم — وأنا أسمعك", true);
        state.vadTimer = setInterval(() => {
          if (Date.now() - state.recT0 > 30000) finalizeRecording();
        }, 1000);
      })
      .catch((e) => toast("ماكو إذن مايك: " + e.message));
  };
}

// ---------------- unified ----------------
export function wireMic() {
  if (BROWSER_MODE) wireBrowser();
  else wireServer();
}

export function startAuto(manual) {
  if (BROWSER_MODE) {
    if (bActive || state.inFlight) return;
    bStart();
    if (manual) micBtn.classList.add("listening");
    return;
  }
  ensureStream()
    .then(() => {
      state.recT0 = Date.now();
      startRec();
      if (manual) micBtn.classList.add("listening");
      face.setState("تكلّم — وأنا أسمعك", true);
      state.vadTimer = setInterval(() => {
        if (Date.now() - state.recT0 > 30000) finalizeRecording();
      }, 1000);
    })
    .catch((e) => toast("ماكو إذن مايك: " + e.message));
}

export function wireUpload(upBtn, upFile) {
  upBtn.onclick = () => {
    ensureAudioCtx();
    upFile.click();
  };
  upFile.onchange = async () => {
    const f = upFile.files[0];
    upFile.value = "";
    if (!f || state.inFlight) return;
    state.inFlight = true;
    await sendBlob(f, f.name);
    state.inFlight = false;
  };
}
