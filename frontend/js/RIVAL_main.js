import { state, toast } from "./RIVAL_state.js";
import { addText } from "./RIVAL_chat.js";
import { face } from "./RIVAL_face.js";
import { aiReply } from "./RIVAL_api.js";
import { wireMic, wireUpload } from "./RIVAL_voice.js";

(function background() {
  const c = document.getElementById("bgfx");
  const x = c.getContext("2d");
  let w, h;
  const P = [];
  function resize() {
    w = c.width = innerWidth;
    h = c.height = innerHeight;
    P.length = 0;
    for (let i = 0; i < 46; i++) {
      P.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.8 + 0.3,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        col: Math.random() < 0.5 ? "#8b5cf6" : "#22d3c5",
      });
    }
  }
  resize();
  addEventListener("resize", resize);
  (function loop() {
    x.clearRect(0, 0, w, h);
    for (const p of P) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x += w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y += h;
      if (p.y > h) p.y = 0;
      x.beginPath();
      x.arc(p.x, p.y, p.r, 0, 7);
      x.fillStyle = p.col + "26";
      x.fill();
    }
    requestAnimationFrame(loop);
  })();
})();

wireMic();
wireUpload(document.getElementById("upBtn"), document.getElementById("upFile"));

const txtIn = document.getElementById("txtIn");
const sendBtn = document.getElementById("sendBtn");
function sendText() {
  const v = txtIn.value.trim();
  if (!v || state.inFlight) return;
  txtIn.value = "";
  addText("you", v);
  state.inFlight = true;
  aiReply(v).then(() => {
    state.inFlight = false;
  });
}
sendBtn.onclick = sendText;
txtIn.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendText();
});

const menu = document.getElementById("menu");
document.getElementById("gearBtn").onclick = (e) => {
  e.stopPropagation();
  menu.classList.toggle("open");
};
document.addEventListener("click", (e) => {
  if (!e.target.closest("#menu") && !e.target.closest("#gearBtn")) menu.classList.remove("open");
});

document.querySelectorAll("[data-v]").forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll("[data-v]").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    state.curVoice = b.dataset.v;
  };
});

let prevAudio = null;
document.querySelectorAll("[data-p]").forEach((b) => {
  b.onclick = async (e) => {
    e.stopPropagation();
    const key = b.dataset.p;
    document.querySelectorAll(".ppy").forEach((x) => x.classList.remove("playing"));
    b.classList.add("playing");
    try {
      if (prevAudio) prevAudio.pause();
      prevAudio = new Audio(location.origin + "/api/preview/" + key);
      await prevAudio.play();
      state.curVoice = key;
      document
        .querySelectorAll("[data-v]")
        .forEach((x) => x.classList.toggle("active", x.dataset.v === key));
      prevAudio.onended = () => b.classList.remove("playing");
    } catch {
      b.classList.remove("playing");
    }
  };
});

document.getElementById("openCallSw").onclick = function () {
  state.openCall = !state.openCall;
  this.classList.toggle("on", state.openCall);
};
document.getElementById("manualSw").onclick = function () {
  document
    .getElementById("txtDock")
    .style.setProperty("display", this.classList.toggle("on") ? "flex" : "none");
};

(async function connect() {
  try {
    await fetch(location.origin + "/api/session", { method: "POST" });
    document.getElementById("connTxt").textContent = "متصل";
  } catch {
    document.getElementById("connTxt").textContent = "غير متصل";
    const led = document.getElementById("led");
    led.style.background = "var(--bad)";
    led.style.boxShadow = "0 0 8px var(--bad)";
  }
})();

face.setState("اضغط المايك وتكلم");
