import { state, ensureAudioCtx, toast } from "./RIVAL_state.js";
import { addText, voiceWidget, driveMouth } from "./RIVAL_chat.js";
import { face } from "./RIVAL_face.js";
import { aiReply, sttBlob } from "./RIVAL_api.js";

const micBtn = document.getElementById("micBtn");

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
    state.inFlight = true;
    await aiReply(q);
    state.inFlight = false;
  } catch (err) {
    t.textContent = "⚠️ " + err.message;
    t.classList.remove("pending");
    face.setState("");
  }
  driveMouth(userAudio, face.setSpeaking);
}

export async function finalizeRecording() {
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

export function wireMic() {
  micBtn.onclick = () => {
    if (state.recActive) {
      finalizeRecording();
      return;
    }
    startAuto(false);
  };
}

export function startAuto(manual) {
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
