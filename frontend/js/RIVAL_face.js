const canvas = document.getElementById("faceCv");
const ctx = canvas.getContext("2d");
ctx.scale(2, 2);

let mouthLevel = 0;
let faceMode = "idle";
let phase = 0;
let gazeX = 0;
let gazeY = 0;
let nextGaze = 1500;
let blinkState = 0;
let blinkUntil = 0;
let nextBlink = 2200;

function geometry(t) {
  const cx = 100;
  const bob = Math.sin(t * 0.7) * 2.5;
  const Y = (y) => 22 + y + bob;

  const outline = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + Math.PI / 2;
    let px = cx + Math.cos(a) * 54;
    const py = Y(72) + Math.sin(a) * 66;
    if (Math.sin(a) > 0.6) px = cx + (px - cx) * 0.7;
    outline.push([px, py]);
  }

  const ears = [[cx - 54, Y(58)], [cx - 56, Y(72)], [cx + 54, Y(58)], [cx + 56, Y(72)]];

  const eyeY = Y(50);
  const open = blinkState === 1 ? 0.05 : 1;
  const eyeRing = (ex) => {
    const ring = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ring.push([ex + Math.cos(a) * 10 + gazeX, eyeY + Math.sin(a) * 6 * open + gazeY]);
    }
    return ring;
  };
  const eyeL = eyeRing(cx - 24);
  const eyeR = eyeRing(cx + 24);
  const irisL = [cx - 24 + gazeX, eyeY + gazeY];
  const irisR = [cx + 24 + gazeX, eyeY + gazeY];

  const raise = faceMode === "think" ? 4 : 0;
  const browL = [[cx - 34, Y(38) - raise], [cx - 24, Y(35) - raise * 1.3], [cx - 14, Y(37) - raise]];
  const browR = [[cx + 14, Y(37) - raise], [cx + 24, Y(35) - raise * 1.3], [cx + 34, Y(38) - raise]];
  const nose = [[cx, Y(54)], [cx - 6, Y(70)], [cx + 6, Y(70)]];

  const mY = Y(88);
  const hw = 15;
  const openAmt = Math.min(1.4, mouthLevel) * 14;
  const mouthTop = [
    [cx - hw, mY],
    [cx - hw * 0.5, mY - 2],
    [cx, mY - 2.5],
    [cx + hw * 0.5, mY - 2],
    [cx + hw, mY],
  ];
  const mouthBot = [
    [cx - hw * 0.8, mY + 4 + openAmt * 0.8],
    [cx - hw * 0.3, mY + 6 + openAmt],
    [cx + hw * 0.3, mY + 6 + openAmt],
    [cx + hw * 0.8, mY + 4 + openAmt * 0.8],
  ];

  return { outline, ears, eyeL, eyeR, irisL, irisR, browL, browR, nose, mouthTop, mouthBot, openAmt };
}

function render() {
  requestAnimationFrame(render);
  phase += 0.02;
  const now = Date.now();
  if (now > nextBlink && blinkState === 0) {
    blinkState = 1;
    blinkUntil = now + 130;
  }
  if (blinkState === 1 && now > blinkUntil) {
    blinkState = 0;
    nextBlink = now + 2200 + Math.random() * 3200;
  }
  if (now > nextGaze) {
    gazeX = Math.random() * 4 - 2;
    gazeY = Math.random() * 2 - 1;
    nextGaze = now + 1800 + Math.random() * 2600;
  }
  if (faceMode !== "speak") mouthLevel *= 0.88;

  ctx.clearRect(0, 0, 200, 200);
  const g = geometry(phase);
  const hot = faceMode === "speak";
  const accent = hot ? "#22d3c5" : "#a78bfa";

  const link = (a, b, alpha = 0.5, w = 1) => {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.strokeStyle = "rgba(139,92,246," + alpha + ")";
    ctx.lineWidth = w;
    ctx.stroke();
  };
  const dot = (p, col, r = 2, glow = false) => {
    if (glow) {
      ctx.save();
      ctx.shadowColor = col;
      ctx.shadowBlur = 9;
    }
    ctx.beginPath();
    ctx.arc(p[0], p[1], r, 0, 7);
    ctx.fillStyle = col;
    ctx.fill();
    if (glow) ctx.restore();
  };
  const chain = (arr, alpha = 0.5, w = 1) => {
    for (let i = 0; i < arr.length - 1; i++) link(arr[i], arr[i + 1], alpha, w);
  };
  const ring = (arr, alpha = 0.5, w = 1) => {
    for (let i = 0; i < arr.length; i++) link(arr[i], arr[(i + 1) % arr.length], alpha, w);
  };

  ring(g.outline, 0.5, 1.4);
  link(g.ears[0], g.ears[1], 0.35);
  link(g.ears[2], g.ears[3], 0.35);
  link(g.ears[0], g.outline[3], 0.2);
  link(g.ears[1], g.outline[4], 0.2);
  link(g.ears[2], g.outline[10], 0.2);
  link(g.ears[3], g.outline[11], 0.2);

  ring(g.eyeL, 0.5, 1);
  ring(g.eyeR, 0.5, 1);
  if (blinkState !== 1) {
    dot(g.irisL, accent, 2.2, hot);
    dot(g.irisR, accent, 2.2, hot);
  }

  chain(g.browL, 0.35);
  chain(g.browR, 0.35);
  link(g.eyeL[5], g.browL[0], 0.2);
  link(g.eyeR[5], g.browR[0], 0.2);

  chain(g.nose, 0.4, 0.9);

  chain(g.mouthTop, 0.5, 1.2);
  if (g.openAmt > 0.15) {
    ctx.beginPath();
    ctx.moveTo(g.mouthTop[0][0], g.mouthTop[0][1]);
    for (let i = 1; i < 5; i++) ctx.lineTo(g.mouthTop[i][0], g.mouthTop[i][1]);
    for (let i = g.mouthBot.length - 1; i >= 0; i--) ctx.lineTo(g.mouthBot[i][0], g.mouthBot[i][1]);
    ctx.closePath();
    ctx.fillStyle = "rgba(80,28,40," + (0.25 + Math.min(1, mouthLevel) * 0.45) + ")";
    ctx.fill();
    chain(g.mouthBot, 0.55, 1.2);
  }

  g.outline.forEach((p) => dot(p, "#8b5cf6", 1.8));
  g.ears.forEach((p) => dot(p, "#a78bfa", 1.5));
  g.eyeL.concat(g.eyeR).forEach((p) => dot(p, accent, 1.6, hot));
  g.browL.concat(g.browR).forEach((p) => dot(p, "#b8a6ff", 1.5));
  g.nose.forEach((p) => dot(p, "#8b5cf6", 1.5));
  g.mouthTop.forEach((p) => dot(p, hot ? "#22d3c5" : "#c9a0d0", 1.9, hot));
  g.mouthBot.forEach((p) => dot(p, hot ? "#22d3c5" : "#c9a0d0", 1.7, hot));
}

function setSpeaking(level) {
  faceMode = "speak";
  mouthLevel = Math.max(mouthLevel, level);
}

function setMode(mode) {
  faceMode = mode;
}

function setState(text, hot) {
  const label = document.getElementById("stateLbl");
  const ring = document.getElementById("faceRing");
  label.textContent = text;
  label.classList.toggle("hot", !!hot);
  ring.style.background = "radial-gradient(circle," + (hot ? "rgba(255,180,84,.5)" : "rgba(139,92,246,.3)") + ",transparent 68%)";
}

render();

export const face = {
  setMode,
  setSpeaking,
  setState,
};
