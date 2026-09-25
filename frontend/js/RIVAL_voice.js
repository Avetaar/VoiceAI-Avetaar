import { state, toast } from "./RIVAL_state.js";
import { addText } from "./RIVAL_chat.js";
import { face } from "./RIVAL_face.js";
import { aiReply } from "./RIVAL_api.js";

const micBtn = document.getElementById("micBtn");

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export function wireMic() {
  if (!SpeechRecognition) {
    toast("المتصفح ما يدعم الفهم المباشر — جرّب Chrome");
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = "ar";
  recognition.continuous = true;
  recognition.interimResults = true;

  let finalText = "";
  let active = false;
  let bubble = null;
  let textEl = null;

  recognition.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript + " ";
      else interim += r[0].transcript;
    }
    const all = (finalText + interim).trim();
    if (!bubble) {
      const created = addText("you", "");
      bubble = created.bubble;
      textEl = created.t;
      textEl.classList.add("pending");
    }
    textEl.textContent = all || "⏳ أسمعك…";
    face.setState("أسمع كلامك…", true);
  };

  recognition.onend = () => {
    if (active) {
      try {
        recognition.start();
      } catch {
        active = false;
      }
    }
  };

  recognition.onerror = (e) => {
    if (e.error === "not-allowed") {
      toast("ماكو إذن مايك — شغّل الأذن من المتصفح");
      active = false;
      micBtn.classList.remove("listening");
    }
  };

  micBtn.onclick = () => {
    if (active) {
      active = false;
      try {
        recognition.stop();
      } catch {
        recognition = null;
      }
      const q = (finalText || "").trim();
      finalText = "";
      if (!q) {
        if (textEl) {
          textEl.textContent = "⚠️ ما سمعت كلامك — جرّب ثانية";
          textEl.classList.remove("pending");
        }
        face.setState("");
        toast("ما سمعت كلامك — سجّل ثانية");
      } else {
        textEl.textContent = q;
        textEl.classList.remove("pending");
        state.inFlight = true;
        aiReply(q).then(() => {
          state.inFlight = false;
        });
      }
      bubble = null;
      textEl = null;
      micBtn.classList.remove("listening");
      return;
    }
    if (state.inFlight) {
      toast("لحظة — بانتظار الرد");
      return;
    }
    active = true;
    finalText = "";
    try {
      recognition.start();
    } catch {
      active = false;
    }
    micBtn.classList.add("listening");
    face.setState("تكلّم — وأنا أسمعك", true);
  };
}

export function wireUpload() {}
