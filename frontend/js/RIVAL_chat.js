import { state } from "./RIVAL_state.js";

const chatEl = document.getElementById("chat");
const msgsEl = document.getElementById("msgs");
const emptyEl = document.getElementById("emptyMsg");

function clearEmpty() {
  if (emptyEl && emptyEl.parentNode) emptyEl.remove();
}

function makeRow(who) {
  clearEmpty();
  const row = document.createElement("div");
  row.className = "row " + who;
  const ava = document.createElement("div");
  ava.className = "ava";
  ava.textContent = who === "you" ? "أ" : "اڤ";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  const whoLbl = document.createElement("div");
  whoLbl.className = "who";
  whoLbl.textContent = who === "you" ? "أنت" : "إيفيتار";
  bubble.appendChild(whoLbl);
  row.appendChild(ava);
  row.appendChild(bubble);
  msgsEl.appendChild(row);
  chatEl.scrollTop = chatEl.scrollHeight;
  return { row, bubble };
}

export function addText(who, text) {
  const { row, bubble } = makeRow(who);
  const t = document.createElement("div");
  t.className = "txt";
  t.textContent = text;
  bubble.appendChild(t);
  return { row, bubble, t };
}

export function typingRow() {
  const { row, bubble } = makeRow("ai");
  const d = document.createElement("div");
  d.className = "dots";
  d.innerHTML = "<i></i><i></i><i></i>";
  bubble.appendChild(d);
  return row;
}

function fmtTime(s) {
  s = Math.round(s || 0);
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

export function voiceWidget(parent, label, url, autoplay) {
  const wrap = document.createElement("div");
  wrap.className = "vwwrap";
  if (label) {
    const lb = document.createElement("div");
    lb.className = "vwlabel";
    lb.textContent = label;
    wrap.appendChild(lb);
  }
  const bar = document.createElement("div");
  bar.className = "vw";
  bar.innerHTML = '<button class="vwbtn">▶</button><div class="vwbar"><div class="vwfill"></div></div><span class="vwtime">…</span>';
  wrap.appendChild(bar);
  parent.appendChild(wrap);

  const btn = bar.querySelector(".vwbtn");
  const fill = bar.querySelector(".vwfill");
  const tm = bar.querySelector(".vwtime");
  const audio = new Audio(url);
  audio.ondurationchange = () => {
    tm.textContent = fmtTime(audio.duration);
  };
  audio.ontimeupdate = () => {
    if (audio.duration) fill.style.width = (audio.currentTime / audio.duration) * 100 + "%";
  };
  audio.onplay = () => {
    btn.textContent = "⏸";
  };
  audio.onpause = () => {
    btn.textContent = "▶";
  };
  audio.onended = () => {
    btn.textContent = "▶";
    fill.style.width = "100%";
  };
  btn.onclick = () => {
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  };
  if (autoplay) audio.play().catch(() => {});
  return audio;
}

let outSrc = null;
export function driveMouth(audio, onLevel) {
  if (!state.actx) return;
  try {
    if (outSrc) {
      try {
        outSrc.disconnect();
      } catch {
        outSrc = null;
      }
    }
    const src = state.actx.createMediaElementSource(audio);
    const analyser = state.actx.createAnalyser();
    analyser.fftSize = 256;
    const freq = new Uint8Array(analyser.frequencyBinCount);
    src.connect(analyser);
    analyser.connect(state.actx.destination);
    outSrc = src;
    const tick = () => {
      if (audio.paused || audio.ended) {
        if (onLevel) onLevel(0);
        return;
      }
      analyser.getByteFrequencyData(freq);
      let sum = 0;
      for (let i = 0; i < freq.length; i += 2) sum += freq[i];
      const level = Math.min(1, sum / freq.length / 3 / 255);
      if (onLevel) onLevel(0.4 + level * 1.1);
      requestAnimationFrame(tick);
    };
    tick();
  } catch {
    outSrc = null;
  }
}
