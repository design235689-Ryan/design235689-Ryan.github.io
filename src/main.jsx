import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Gem, Heart, Pause, Play, RotateCcw, Sparkles, Volume2, VolumeX } from "lucide-react";
import "./styles.css";

const W = 960;
const H = 540;
const SPRITES = {
  player: "/assets/kenney/playerShip1_blue.png",
  enemyImp: "/assets/kenney/enemyRed3.png",
  enemyOrb: "/assets/kenney/enemyBlue5.png",
  enemyMask: "/assets/kenney/enemyBlack4.png",
  background: "/assets/kenney/space_purple.png"
};
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const hit = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < (a.r || 12) + (b.r || 12);

function App() {
  const canvasRef = useRef(null);
  const keys = useRef(new Set());
  const pointer = useRef(null);
  const movePad = useRef({ x: 0, y: 0, active: false, id: null });
  const firePad = useRef(false);
  const audio = useRef(null);
  const game = useRef(null);
  const sprites = useRef({});
  const [snap, setSnap] = useState({ score: 0, hp: 5, wave: 1, power: 1, buffTimer: 0, paused: true, over: false, muted: false, started: false });
  const [stick, setStick] = useState({ x: 0, y: 0, active: false });

  const reset = () => {
    game.current = {
      t: 0,
      score: 0,
      hp: 5,
      wave: 1,
      paused: true,
      started: false,
      over: false,
      shake: 0,
      player: { x: 150, y: H / 2, r: 18, cool: 0, power: 1, inv: 80 },
      buffTimer: 0,
      buffName: "",
      shots: [],
      enemies: [],
      enemyShots: [],
      sparks: [],
      pickups: [],
      stars: Array.from({ length: 120 }, () => ({ x: Math.random() * W, y: Math.random() * H, z: 0.4 + Math.random() * 1.8 })),
      moon: Array.from({ length: 12 }, (_, i) => ({ x: 730 + i * 43, y: 410 + Math.sin(i) * 24, r: 45 + Math.random() * 70 })),
      muted: snap.muted
    };
    setSnap((s) => ({ ...s, score: 0, hp: 5, wave: 1, power: 1, buffTimer: 0, paused: true, over: false, started: false }));
  };

  useEffect(reset, []);

  useEffect(() => {
    Object.entries(SPRITES).forEach(([key, src]) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        sprites.current[key] = img;
      };
    });
  }, []);

  const startGame = () => {
    const g = game.current;
    if (!g || g.started || g.over) return;
    g.started = true;
    g.paused = false;
    setSnap((s) => ({ ...s, started: true, paused: false }));
  };

  useEffect(() => {
    const down = (e) => {
      keys.current.add(e.key.toLowerCase());
      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(e.key.toLowerCase())) e.preventDefault();
      if (e.key === " ") startGame();
    };
    const up = (e) => keys.current.delete(e.key.toLowerCase());
    addEventListener("keydown", down);
    addEventListener("keyup", up);
    return () => {
      removeEventListener("keydown", down);
      removeEventListener("keyup", up);
    };
  }, []);

  const beep = (freq, dur = 0.04, type = "square", gain = 0.03) => {
    const g = game.current;
    if (!g || g.muted) return;
    if (!audio.current) audio.current = new AudioContext();
    const ctx = audio.current;
    const osc = ctx.createOscillator();
    const vol = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = type;
    vol.gain.value = gain;
    osc.connect(vol);
    vol.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  };

  useEffect(() => {
    let raf;
    let last = performance.now();
    const ctx = canvasRef.current.getContext("2d");
    const loop = (now) => {
      const dt = Math.min(2, (now - last) / 16.67);
      last = now;
      update(dt);
      draw(ctx);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const spawn = (g) => {
    if (g.t % Math.max(26, 80 - g.wave * 6) < 1) {
      const kind = Math.random() < 0.18 ? "mask" : Math.random() < 0.34 ? "orb" : "imp";
      g.enemies.push({
        kind,
        x: W + 40,
        y: 70 + Math.random() * (H - 140),
        r: kind === "mask" ? 28 : 20,
        hp: kind === "mask" ? 5 + g.wave : kind === "orb" ? 2 : 1,
        phase: Math.random() * 10,
        cool: 30 + Math.random() * 70
      });
    }
    if (g.wave >= 4 && !g.enemies.some((e) => e.kind === "boss")) {
      g.enemies.push({ kind: "boss", x: W + 130, y: H / 2, r: 72, hp: 95, max: 95, phase: 0, cool: 70 });
      g.wave = 5;
    }
  };

  const update = (dt) => {
    const g = game.current;
    if (!g || g.paused || g.over) return;
    g.t += dt;
    const p = g.player;
    let ax = 0;
    let ay = 0;
    if (keys.current.has("arrowleft") || keys.current.has("a")) ax--;
    if (keys.current.has("arrowright") || keys.current.has("d")) ax++;
    if (keys.current.has("arrowup") || keys.current.has("w")) ay--;
    if (keys.current.has("arrowdown") || keys.current.has("s")) ay++;
    ax += movePad.current.x;
    ay += movePad.current.y;
    const len = Math.hypot(ax, ay);
    if (len > 1) {
      ax /= len;
      ay /= len;
    }
    if (pointer.current) {
      p.x += (pointer.current.x - p.x) * 0.18;
      p.y += (pointer.current.y - p.y) * 0.18;
    } else {
      p.x += ax * 5.4 * dt;
      p.y += ay * 5.4 * dt;
    }
    p.x = clamp(p.x, 42, W - 90);
    p.y = clamp(p.y, 42, H - 42);
    p.cool -= dt;
    p.inv -= dt;
    g.buffTimer = Math.max(0, g.buffTimer - dt);
    const firing = keys.current.has(" ") || pointer.current || firePad.current;
    if (firing && p.cool <= 0) {
      const spread = p.power > 1 ? [-0.18, 0, 0.18].slice(0, p.power + 1) : [0];
      spread.forEach((s) => g.shots.push({ x: p.x + 26, y: p.y, vx: 12, vy: s * 10, r: 5 }));
      p.cool = Math.max(6, 14 - p.power * 2);
      beep(620, 0.025, "triangle", 0.02);
    }
    if (g.t > g.wave * 650 && g.wave < 4) g.wave++;
    spawn(g);
    g.stars.forEach((s) => {
      s.x -= (1 + s.z * 2.4) * dt;
      if (s.x < -4) Object.assign(s, { x: W + Math.random() * 30, y: Math.random() * H, z: 0.4 + Math.random() * 1.8 });
    });
    g.shots.forEach((s) => {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    });
    g.enemyShots.forEach((s) => {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    });
    g.enemies.forEach((e) => {
      e.phase += dt * 0.05;
      if (e.kind === "boss") {
        e.x += (760 - e.x) * 0.025 * dt;
        e.y = H / 2 + Math.sin(g.t / 35) * 100;
        e.cool -= dt;
        if (e.cool <= 0) {
          for (let i = -2; i <= 2; i++) g.enemyShots.push({ x: e.x - 64, y: e.y + i * 18, vx: -5.4, vy: i * 1.4, r: 8 });
          e.cool = 42;
          beep(150, 0.05, "sawtooth", 0.018);
        }
      } else {
        e.x -= (e.kind === "orb" ? 4.2 : 3.1) * dt;
        e.y += Math.sin(g.t / 18 + e.phase) * (e.kind === "mask" ? 1.4 : 2.3) * dt;
        e.cool -= dt;
        if (e.cool <= 0) {
          const a = Math.atan2(p.y - e.y, p.x - e.x);
          g.enemyShots.push({ x: e.x - 12, y: e.y, vx: Math.cos(a) * 4.2, vy: Math.sin(a) * 4.2, r: 6 });
          e.cool = 85 + Math.random() * 60;
        }
      }
    });
    for (const s of g.shots) for (const e of g.enemies) if (!s.dead && !e.dead && hit(s, e)) {
      s.dead = true;
      e.hp -= 1;
      g.sparks.push({ x: s.x, y: s.y, n: 12, c: "#ffd56f" });
      if (e.hp <= 0) {
        e.dead = true;
        g.score += e.kind === "boss" ? 5000 : e.kind === "mask" ? 480 : 180;
        g.shake = 12;
        if (Math.random() < 0.24 || e.kind === "boss") g.pickups.push({ x: e.x, y: e.y, r: 13, type: e.kind === "boss" ? "heart" : "power" });
        beep(e.kind === "boss" ? 90 : 260, 0.09, "sawtooth", 0.04);
      }
    }
    for (const e of g.enemies) if (!e.dead && p.inv <= 0 && hit(p, e)) damage(g);
    for (const b of g.enemyShots) if (!b.dead && p.inv <= 0 && hit(p, b)) {
      b.dead = true;
      damage(g);
    }
    for (const item of g.pickups) {
      item.x -= 2 * dt;
      if (hit(p, item)) {
        item.dead = true;
        if (item.type === "heart") {
          g.hp = Math.min(5, g.hp + 1);
          g.buffName = "LIFE UP";
        } else {
          p.power = Math.min(3, p.power + 1);
          g.buffName = "POWER UP";
        }
        g.buffTimer = 150;
        g.score += 300;
        beep(880, 0.08, "sine", 0.035);
      }
    }
    g.sparks.forEach((s) => (s.n -= dt));
    g.shots = g.shots.filter((s) => !s.dead && s.x < W + 60 && s.y > -20 && s.y < H + 20);
    g.enemyShots = g.enemyShots.filter((s) => !s.dead && s.x > -30 && s.y > -40 && s.y < H + 40);
    g.enemies = g.enemies.filter((e) => !e.dead && e.x > -140);
    g.pickups = g.pickups.filter((i) => !i.dead && i.x > -30);
    g.sparks = g.sparks.filter((s) => s.n > 0);
    g.shake = Math.max(0, g.shake - dt);
    if (g.t % 8 < dt) setSnap({
      score: g.score,
      hp: g.hp,
      wave: g.wave,
      power: g.player.power,
      buffTimer: g.buffTimer,
      paused: g.paused,
      over: g.over,
      muted: g.muted,
      started: g.started
    });
  };

  const damage = (g) => {
    g.hp--;
    g.player.inv = 95;
    g.player.power = Math.max(1, g.player.power - 1);
    g.shake = 18;
    beep(95, 0.12, "sawtooth", 0.05);
    if (g.hp <= 0) g.over = true;
  };

  const draw = (ctx) => {
    const g = game.current;
    if (!g) return;
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    if (g.shake) ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);
    drawScene(ctx, g);
    ctx.fillStyle = "#fff8";
    g.stars.forEach((s) => ctx.fillRect(s.x, s.y, s.z, s.z));
    drawPlayer(ctx, g.player, g.t);
    g.shots.forEach((s) => {
      ctx.fillStyle = "#f8e98d";
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, 13, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    g.enemyShots.forEach((s) => {
      ctx.fillStyle = "#ff6e91";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    g.enemies.forEach((e) => drawEnemy(ctx, e, g.t));
    drawStatusBadge(ctx, g);
    g.pickups.forEach((i) => {
      ctx.fillStyle = i.type === "heart" ? "#ff5f7e" : "#70f2c5";
      ctx.beginPath();
      ctx.arc(i.x, i.y, i.r + Math.sin(g.t / 5) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#101020";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(i.type === "heart" ? "+" : "P", i.x, i.y + 6);
    });
    g.sparks.forEach((s) => {
      ctx.fillStyle = s.c;
      for (let i = 0; i < 9; i++) ctx.fillRect(s.x + Math.cos(i) * (14 - s.n), s.y + Math.sin(i * 2) * (14 - s.n), 3, 3);
    });
    if (g.over) overlay(ctx, "MISSION FAILED", "按重新開始再挑戰月之航道");
    if (g.paused && !g.over) overlay(ctx, g.started ? "PAUSED" : "READY", g.started ? "繼續飛行，躲開彈幕" : "按 Play、空白鍵或拖曳開始");
    ctx.restore();
  };

  const drawScene = (ctx, g) => {
    const bg = sprites.current.background;
    if (bg?.complete) {
      const scale = H / bg.height;
      const tileW = bg.width * scale;
      const offset = (g.t * 0.45) % tileW;
      for (let x = -tileW - offset; x < W + tileW; x += tileW) {
        ctx.drawImage(bg, x, 0, tileW, H);
      }
      const haze = ctx.createLinearGradient(0, 0, W, H);
      haze.addColorStop(0, "rgba(8, 9, 24, .18)");
      haze.addColorStop(0.7, "rgba(22, 31, 74, .3)");
      haze.addColorStop(1, "rgba(20, 8, 28, .48)");
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, W, H);
      return;
    }
    const sky = ctx.createLinearGradient(0, 0, W, H);
    sky.addColorStop(0, "#090718");
    sky.addColorStop(0.55, "#172456");
    sky.addColorStop(1, "#2c1844");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
  };

  const drawStatusBadge = (ctx, g) => {
    if (g.buffTimer <= 0) return;
    ctx.save();
    const alpha = clamp(g.buffTimer / 35, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.translate(g.player.x + 18, g.player.y - 42);
    ctx.fillStyle = "rgba(6, 10, 25, .68)";
    ctx.strokeStyle = "#70f2c5";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-56, -18, 112, 32, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#70f2c5";
    ctx.beginPath();
    ctx.moveTo(-38, -1);
    ctx.lineTo(-28, -11);
    ctx.lineTo(-18, -1);
    ctx.lineTo(-28, 9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff7d6";
    ctx.font = "800 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(g.buffName, -10, 5);
    ctx.restore();
  };

  const drawPlayer = (ctx, p, t) => {
    const img = sprites.current.player;
    if (img?.complete) {
      ctx.save();
      ctx.globalAlpha = p.inv > 0 && Math.floor(t / 5) % 2 ? 0.45 : 1;
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.PI / 2);
      const scale = 0.62;
      ctx.drawImage(img, -img.width * scale / 2, -img.height * scale / 2, img.width * scale, img.height * scale);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = "#ff7a45";
      ctx.beginPath();
      ctx.moveTo(-40, -7);
      ctx.lineTo(-64 - Math.random() * 10, 0);
      ctx.lineTo(-40, 7);
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.globalAlpha = p.inv > 0 && Math.floor(t / 5) % 2 ? 0.45 : 1;
    ctx.translate(p.x, p.y);
    ctx.fillStyle = "rgba(7, 10, 25, .55)";
    ctx.beginPath();
    ctx.ellipse(-7, 22, 38, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c78a39";
    ctx.beginPath();
    ctx.moveTo(-31, -6);
    ctx.lineTo(-62 - Math.sin(t / 4) * 6, 0);
    ctx.lineTo(-31, 6);
    ctx.closePath();
    ctx.fill();
    const hull = ctx.createLinearGradient(-30, -22, 38, 22);
    hull.addColorStop(0, "#5e3a25");
    hull.addColorStop(0.45, "#d4a24d");
    hull.addColorStop(1, "#fff0a6");
    ctx.fillStyle = hull;
    ctx.beginPath();
    ctx.moveTo(-34, 0);
    ctx.bezierCurveTo(-13, -27, 24, -21, 42, -3);
    ctx.lineTo(57, 0);
    ctx.lineTo(42, 3);
    ctx.bezierCurveTo(24, 21, -13, 27, -34, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3a2417";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#7dd3fc";
    ctx.beginPath();
    ctx.moveTo(-8, -25);
    ctx.quadraticCurveTo(10, -52, 34, -28);
    ctx.quadraticCurveTo(13, -24, 1, -9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#8ff0d0";
    ctx.beginPath();
    ctx.moveTo(-9, 25);
    ctx.quadraticCurveTo(10, 52, 34, 28);
    ctx.quadraticCurveTo(13, 24, 1, 9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#5eead4";
    ctx.beginPath();
    ctx.arc(10, 0, 10 + Math.sin(t / 8) * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#173346";
    ctx.beginPath();
    ctx.arc(10, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f3d27b";
    ctx.beginPath();
    ctx.arc(43, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff2b8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-18, 0, 12, -1.2, 1.2);
    ctx.stroke();
    ctx.fillStyle = "#ff7a45";
    ctx.beginPath();
    ctx.moveTo(-39, -8);
    ctx.lineTo(-59 - Math.random() * 10, 0);
    ctx.lineTo(-39, 8);
    ctx.fill();
    ctx.restore();
  };

  const drawEnemy = (ctx, e, t) => {
    const enemyImg = e.kind === "boss" ? sprites.current.enemyMask : e.kind === "mask" ? sprites.current.enemyMask : e.kind === "orb" ? sprites.current.enemyOrb : sprites.current.enemyImp;
    if (enemyImg?.complete) {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(-Math.PI / 2 + Math.sin(t / 20 + e.phase) * 0.12);
      const scale = e.kind === "boss" ? 1.35 : e.kind === "mask" ? 0.68 : 0.58;
      ctx.drawImage(enemyImg, -enemyImg.width * scale / 2, -enemyImg.height * scale / 2, enemyImg.width * scale, enemyImg.height * scale);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.moveTo(-e.r - 2, -5);
      ctx.lineTo(-e.r - 18, 0);
      ctx.lineTo(-e.r - 2, 5);
      ctx.fill();
      if (e.kind === "boss") {
        ctx.fillStyle = "#ff6e91";
        ctx.fillRect(-68, -82, Math.max(0, 136 * e.hp / e.max), 8);
      }
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.kind === "boss") {
      const boss = ctx.createLinearGradient(-82, -95, 82, 95);
      boss.addColorStop(0, "#27163f");
      boss.addColorStop(0.5, "#6d2f5f");
      boss.addColorStop(1, "#f87171");
      ctx.fillStyle = boss;
      ctx.beginPath();
      ctx.moveTo(-90, 0);
      ctx.bezierCurveTo(-42, -104, 50, -96, 92, 0);
      ctx.bezierCurveTo(48, 96, -43, 104, -90, 0);
      ctx.fill();
      ctx.fillStyle = "#2a1434";
      ctx.beginPath();
      ctx.moveTo(-82, -10);
      ctx.lineTo(-128, -58);
      ctx.lineTo(-52, -38);
      ctx.closePath();
      ctx.moveTo(-82, 10);
      ctx.lineTo(-128, 58);
      ctx.lineTo(-52, 38);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#f6c86e";
      ctx.beginPath();
      ctx.arc(-20, -20, 15, 0, Math.PI * 2);
      ctx.arc(-20, 20, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.arc(-24, -20, 5, 0, Math.PI * 2);
      ctx.arc(-24, 20, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff6e91";
      ctx.fillRect(-68, -82, Math.max(0, 136 * e.hp / e.max), 8);
    } else {
      ctx.rotate(Math.sin(t / 20 + e.phase) * 0.4);
      const body = e.kind === "mask" ? "#a78bfa" : e.kind === "orb" ? "#61d394" : "#f87171";
      const wing = e.kind === "mask" ? "#5b3b91" : e.kind === "orb" ? "#24785e" : "#7f1d1d";
      ctx.fillStyle = wing;
      ctx.beginPath();
      ctx.moveTo(-e.r * 0.2, -4);
      ctx.lineTo(e.r * 1.25, -e.r * 1.35);
      ctx.lineTo(e.r * 0.55, -2);
      ctx.closePath();
      ctx.moveTo(-e.r * 0.2, 4);
      ctx.lineTo(e.r * 1.25, e.r * 1.35);
      ctx.lineTo(e.r * 0.55, 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(-e.r * 1.25, 0);
      ctx.quadraticCurveTo(-e.r * 0.2, -e.r * 0.95, e.r * 1.25, 0);
      ctx.quadraticCurveTo(-e.r * 0.2, e.r * 0.95, -e.r * 1.25, 0);
      ctx.fill();
      ctx.strokeStyle = "#160f24";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.arc(-e.r * 0.45, -4, 4, 0, Math.PI * 2);
      ctx.arc(-e.r * 0.1, -4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.moveTo(e.r * 1.2, -5);
      ctx.lineTo(e.r * 1.65, 0);
      ctx.lineTo(e.r * 1.2, 5);
      ctx.fill();
    }
    ctx.restore();
  };

  const overlay = (ctx, title, sub) => {
    ctx.fillStyle = "rgba(5, 7, 18, .62)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "800 50px sans-serif";
    ctx.fillText(title, W / 2, H / 2 - 16);
    ctx.font = "18px sans-serif";
    ctx.fillText(sub, W / 2, H / 2 + 24);
  };

  const togglePause = () => {
    const g = game.current;
    if (!g || g.over) return;
    if (!g.started) {
      startGame();
    } else {
      g.paused = !g.paused;
      setSnap((s) => ({ ...s, paused: g.paused, started: g.started }));
    }
  };

  const toggleMute = () => {
    const g = game.current;
    if (!g) return;
    g.muted = !g.muted;
    setSnap((s) => ({ ...s, muted: g.muted }));
  };

  const canvasPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H };
  };

  const setMovePad = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const max = rect.width * 0.32;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const d = Math.hypot(dx, dy) || 1;
    const scale = Math.min(d, max) / d;
    const x = (dx * scale) / max;
    const y = (dy * scale) / max;
    movePad.current = { x, y, active: true, id: e.pointerId };
    setStick({ x: dx * scale, y: dy * scale, active: true });
  };

  const clearMovePad = () => {
    movePad.current = { x: 0, y: 0, active: false, id: null };
    setStick({ x: 0, y: 0, active: false });
  };

  const pressFire = (pressed) => {
    firePad.current = pressed;
    if (pressed) startGame();
  };

  return (
    <main>
      <section className="hud">
        <div>
          <strong>Moon Chariot</strong>
          <span>Score {snap.score.toString().padStart(6, "0")}</span>
        </div>
        <div className="meters">
          <div className="status-pill life" aria-label={`life ${snap.hp}`}>
            <Heart size={17} />
            <span>{Array.from({ length: 5 }, (_, i) => <i key={i} className={i < snap.hp ? "filled" : ""} />)}</span>
          </div>
          <div className={`status-pill buff ${snap.buffTimer > 0 ? "active" : ""}`} aria-label={`power level ${snap.power}`}>
            {snap.buffTimer > 0 ? <Sparkles size={17} /> : <Gem size={17} />}
            <span>Power Lv {snap.power}</span>
          </div>
          <span>Wave {snap.wave}</span>
          <button aria-label="pause" onClick={togglePause}>{snap.paused ? <Play size={18} /> : <Pause size={18} />}</button>
          <button aria-label="mute" onClick={toggleMute}>{snap.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
          <button aria-label="restart" onClick={reset}><RotateCcw size={18} /></button>
        </div>
      </section>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onPointerDown={(e) => {
          startGame();
          pointer.current = canvasPoint(e);
          canvasRef.current.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => { if (e.buttons) pointer.current = canvasPoint(e); }}
        onPointerUp={() => { pointer.current = null; }}
      />
      <section className="mobile-controls" aria-label="mobile controls">
        <div
          className={`joystick ${stick.active ? "active" : ""}`}
          onPointerDown={(e) => {
            startGame();
            e.currentTarget.setPointerCapture(e.pointerId);
            setMovePad(e);
          }}
          onPointerMove={(e) => {
            if (movePad.current.active && movePad.current.id === e.pointerId) setMovePad(e);
          }}
          onPointerUp={clearMovePad}
          onPointerCancel={clearMovePad}
        >
          <span style={{ transform: `translate(${stick.x}px, ${stick.y}px)` }} />
        </div>
        <button
          className="fire-button"
          aria-label="fire"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            pressFire(true);
          }}
          onPointerUp={() => pressFire(false)}
          onPointerCancel={() => pressFire(false)}
        >
          FIRE
        </button>
      </section>
      <footer>
        <span>方向鍵/WASD 移動</span>
        <span>空白鍵射擊</span>
        <span>觸控拖曳自動射擊</span>
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
