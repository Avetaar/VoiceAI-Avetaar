import { state, ensureAudioCtx } from "./RIVAL_state.js";
import { addText, typingRow, voiceWidget, driveMouth } from "./RIVAL_chat.js";
import { face } from "./RIVAL_face.js";

const API = location.origin;

export async function ensureSession() {
  if (state.session) return state.session;
  const res = await fetch(API + "/api/session", { method: "POST" });
  const data = await res.json();
  state.session = data.session;
  return state.session;
}

export async function aiReply(question) {
  ensureAudioCtx();
  const typing = typingRow();
  face.setMode("think");
  face.setState("إيفيتار يفكر…", true);
  try {
    await ensureSession();
    const res = await fetch(API + "/api/talk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session: state.session, text: question, voice: state.curVoice }),
    });
    const data = await res.json();
    typing.remove();
    if (data.error) {
      addText("ai", "⚠️ " + data.error);
      face.setMode("idle");
      face.setState("");
      return;
    }
    const { bubble } = addText("ai", data.text);
    face.setMode("speak");
    face.setState("إيفيتار يتكلم", false);
    if (data.audio) {
      const bytes = atob(data.audio);
      const ab = new ArrayBuffer(bytes.length);
      const u8 = new Uint8Array(ab);
      for (let i = 0; i < bytes.length; i++) u8[i] = bytes.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([u8], { type: data.mime || "audio/mpeg" }));
      driveMouth(voiceWidget(bubble, "صوت إيفيتار", url, true), face.setSpeaking);
    }
    setTimeout(() => {
      face.setMode("idle");
      face.setState(state.openCall ? "بانتظار كلامك" : "اضغط المايك وتكلم");
    }, 3500);
  } catch (err) {
    typing.remove();
    addText("ai", "⚠️ خطأ بالاتصال: " + err.message);
    face.setMode("idle");
    face.setState("");
  }
}
