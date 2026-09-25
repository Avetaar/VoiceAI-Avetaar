const API = location.origin;

export const state = {
  session: null,
  inFlight: false,
  curVoice: "bassel",
  openCall: true,
  actx: null,
};

export function ensureAudioCtx() {
  if (!state.actx) {
    try {
      state.actx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      state.actx = null;
    }
  }
  if (state.actx && state.actx.state === "suspended") {
    state.actx.resume().catch(() => {});
  }
}

export function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 3500);
}
