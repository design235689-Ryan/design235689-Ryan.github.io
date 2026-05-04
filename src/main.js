import * as THREE from "three";
import settingsIcon from "lucide-static/icons/settings.svg";
import "./styles.css";

const TRACKS = [
  { name: "Cedar Bend", mood: "Broad, friendly river", color: 0x7ed9ee, banks: 0x8bcf70, flower: 0xff8fb7, bends: [0, 28, -18, 36, -24, 18, 0] },
  { name: "Lantern Docks", mood: "Tight piers and lights", color: 0x72c7e8, banks: 0xa8c86b, flower: 0xffd166, bends: [0, -35, -8, 44, 20, -28, 0] },
  { name: "Basalt Run", mood: "Heavy turns, dark stone", color: 0x82cde3, banks: 0x9cae7b, flower: 0xf5a3ff, bends: [0, 18, 46, -36, -18, 36, 0] },
  { name: "Lotus Strait", mood: "Fast S-curves", color: 0x7de0cc, banks: 0x9bd676, flower: 0xffa7a0, bends: [0, -42, 24, -34, 42, -16, 0] },
  { name: "Copper Canyon", mood: "Long slipstream lanes", color: 0x83d5f0, banks: 0xd0a66b, flower: 0x9ef7c7, bends: [0, 16, -12, -48, 34, 24, 0] },
  { name: "Moon Ferry", mood: "Mirror-bright night race", color: 0x689dd7, banks: 0x7895c2, flower: 0xf7f3a0, bends: [0, -22, 38, 12, -44, 30, 0] },
  { name: "Market Rapids", mood: "Busy item-heavy chaos", color: 0x86dcef, banks: 0xb7cc70, flower: 0xff9bc2, bends: [0, 40, -38, 18, 36, -42, 0] },
  { name: "Final Delta", mood: "Wide championship riverbed", color: 0x78cfea, banks: 0x84d69b, flower: 0xffcf70, bends: [0, -18, 42, -46, 24, -30, 0] }
];

const CHARACTERS = [
  { name: "Mika", color: 0xf25f5c, top: 1.0, accel: 1.08, weight: 0.92, drift: 1.05 },
  { name: "Oren", color: 0xf6c85f, top: 1.05, accel: 0.95, weight: 1.08, drift: 0.95 },
  { name: "Vera", color: 0x70d6a3, top: 0.96, accel: 1.18, weight: 0.88, drift: 1.08 },
  { name: "Bram", color: 0x7d9df2, top: 1.1, accel: 0.9, weight: 1.16, drift: 0.88 },
  { name: "Sia", color: 0xff9f68, top: 0.99, accel: 1.02, weight: 0.95, drift: 1.22 },
  { name: "Jun", color: 0xb98cf4, top: 1.04, accel: 1.02, weight: 1.0, drift: 1.0 },
  { name: "Tala", color: 0xe8f0ff, top: 0.93, accel: 1.22, weight: 0.84, drift: 1.12 },
  { name: "Rook", color: 0x5fd1d0, top: 1.12, accel: 0.86, weight: 1.22, drift: 0.9 }
];

const ITEMS = [
  { name: "Bubble Nudge", icon: "BN", ahead: 0.6, behind: 1.4 },
  { name: "Wake Fan", icon: "WF", ahead: 0.8, behind: 1.2 },
  { name: "Reed Shield", icon: "RS", ahead: 0.9, behind: 1.1 },
  { name: "Pocket Current", icon: "PC", ahead: 0.35, behind: 2.0 },
  { name: "Foam Pop", icon: "FP", ahead: 1.1, behind: 0.8 },
  { name: "Duck Buoy", icon: "DB", ahead: 1.0, behind: 0.9 },
  { name: "Compass Skip", icon: "CS", ahead: 0.45, behind: 1.8 },
  { name: "Tin Whistle", icon: "TW", ahead: 1.2, behind: 0.7 }
];

const DIFFICULTY = {
  Easy: { aiSpeed: 0.88, reaction: 0.75 },
  Normal: { aiSpeed: 1.0, reaction: 0.48 },
  Hard: { aiSpeed: 1.1, reaction: 0.28 }
};

const LAPS = 3;
const TRACK_LENGTH = 5200;
const LANES = [-24, -16, -8, 0, 8, 16, 24, 30];

const state = {
  screen: "menu",
  selectedTrack: 0,
  selectedCharacter: 0,
  difficulty: "Normal",
  mirror: false,
  clones: false,
  audio: true,
  visual: "Crisp",
  racers: [],
  player: null,
  cameraMode: "chase",
  lastTime: 0,
  raceTime: 0,
  bannerUntil: 0,
  finished: false,
  splitTimes: [],
  keys: new Set()
};

const app = document.querySelector("#app");
app.innerHTML = `
  <div class="game">
    <div id="canvasHost"></div>
    <div id="hud" class="hud hidden">
      <div class="hud-top">
        <div class="hud-cluster">
          <div class="readout"><span class="label">Rank</span><span id="rank" class="value">1/8</span></div>
          <div class="readout"><span class="label">Lap</span><span id="lap" class="value">1/3</span></div>
          <div class="readout"><span class="label">Timer</span><span id="timer" class="value">0:00.00</span></div>
        </div>
        <canvas id="minimap" class="minimap" width="154" height="154"></canvas>
      </div>
      <div id="banner" class="banner"></div>
      <div class="hud-bottom">
        <div>
          <div class="meter"><div id="driftMeter" class="meter-fill"></div></div>
          <div id="raceHelp" class="race-help">Arrow keys / WASD steer and row. Space drifts. E uses item. Esc pauses.</div>
        </div>
        <div id="itemSlot" class="item-slot"><span class="item-icon">--</span><span class="item-name">No Item</span></div>
      </div>
    </div>
    <div id="menu" class="screen"></div>
    <div id="pause" class="screen hidden"></div>
    <div id="options" class="screen hidden"></div>
  </div>
`;

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
document.querySelector("#canvasHost").appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x91c2d0);
scene.fog = new THREE.Fog(0x91c2d0, 130, 760);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
const sun = new THREE.DirectionalLight(0xfff4dc, 2.8);
sun.position.set(-60, 130, 95);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 420;
sun.shadow.camera.left = -120;
sun.shadow.camera.right = 120;
sun.shadow.camera.top = 120;
sun.shadow.camera.bottom = -120;
scene.add(sun, new THREE.HemisphereLight(0xc8f2ff, 0x5a754e, 1.75));

const world = new THREE.Group();
scene.add(world);

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const beadGeo = new THREE.SphereGeometry(1, 18, 14);
const hullGeo = new THREE.CapsuleGeometry(1, 4.8, 8, 18);
const torsoGeo = new THREE.CapsuleGeometry(0.55, 0.7, 6, 14);
const armGeo = new THREE.CapsuleGeometry(0.13, 0.95, 5, 10);
const shaftGeo = new THREE.CylinderGeometry(0.07, 0.07, 6.2, 10);
const paddleGeo = new THREE.BoxGeometry(1, 1, 1);
const trimGeo = new THREE.BoxGeometry(1, 1, 1);
const materials = new Map();
function mat(color, rough = 0.75, options = {}) {
  const key = `${color}-${rough}-${options.metalness || 0.02}-${options.opacity || 1}-${options.transparent || false}`;
  if (!materials.has(key)) {
    materials.set(key, new THREE.MeshStandardMaterial({
      color,
      roughness: rough,
      metalness: options.metalness ?? 0.02,
      transparent: options.transparent || false,
      opacity: options.opacity ?? 1
    }));
  }
  return materials.get(key);
}

function makeBoat(character, isPlayer) {
  const group = new THREE.Group();
  const hull = new THREE.Mesh(hullGeo, mat(character.color, 0.5));
  hull.rotation.x = Math.PI / 2;
  hull.scale.set(1.65, 0.44, 0.66);
  hull.position.y = 0.9;
  hull.castShadow = true;

  const deck = new THREE.Mesh(new THREE.BoxGeometry(3.35, 0.2, 5.35), mat(0xfff1d6, 0.58));
  deck.position.set(0, 1.34, -0.18);
  deck.castShadow = true;
  const bow = new THREE.Mesh(new THREE.ConeGeometry(1.42, 1.4, 18), mat(0xfff1d6, 0.58));
  bow.rotation.x = -Math.PI / 2;
  bow.scale.x = 1.18;
  bow.position.set(0, 1.16, -3.96);
  bow.castShadow = true;

  const stern = new THREE.Mesh(trimGeo, mat(0xfff6df, 0.62));
  stern.scale.set(2.8, 0.35, 0.32);
  stern.position.set(0, 1.43, 3.35);
  stern.castShadow = true;

  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 0.92), mat(0x8c5a35, 0.62));
  seat.position.set(0, 1.55, 0.05);
  seat.castShadow = true;

  const torso = new THREE.Mesh(torsoGeo, mat(isPlayer ? 0xffd966 : 0x36434c, 0.72));
  torso.scale.set(0.9, 1.0, 0.72);
  torso.position.set(0, 2.0, -0.12);
  torso.castShadow = true;
  const head = new THREE.Mesh(beadGeo, mat(0xf3b890, 0.64));
  head.scale.set(0.47, 0.55, 0.47);
  head.position.set(0, 2.78, -0.22);
  head.castShadow = true;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.56), mat(0x44312a, 0.72));
  hair.scale.set(0.49, 0.25, 0.49);
  hair.position.set(0, 3.08, -0.22);
  hair.castShadow = true;
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.05), mat(0x243036, 0.8));
  face.position.set(0, 2.78, -0.68);
  face.castShadow = true;

  const leftArm = new THREE.Mesh(armGeo, mat(0xf3b890, 0.64));
  const rightArm = leftArm.clone();
  leftArm.rotation.set(0.25, 0.1, 1.08);
  rightArm.rotation.set(0.25, -0.1, -1.08);
  leftArm.position.set(-0.72, 2.06, 0.2);
  rightArm.position.set(0.72, 2.06, 0.2);
  leftArm.castShadow = true;
  rightArm.castShadow = true;

  const stripe = new THREE.Mesh(trimGeo, mat(0xffffff, 0.6));
  stripe.scale.set(3.6, 0.08, 0.12);
  stripe.position.set(0, 1.48, -1.35);
  stripe.castShadow = true;

  const oarMat = mat(0x8d5b38, 0.52);
  const bladeMat = mat(0xfff2bd, 0.44);
  const leftOar = new THREE.Group();
  const rightOar = new THREE.Group();
  for (const [oar, side] of [[leftOar, -1], [rightOar, 1]]) {
    const shaft = new THREE.Mesh(shaftGeo, oarMat);
    shaft.rotation.z = Math.PI / 2;
    const blade = new THREE.Mesh(paddleGeo, bladeMat);
    shaft.castShadow = true;
    blade.scale.set(1.15, 0.08, 0.72);
    blade.position.set(side * 3.35, 0, -0.08);
    blade.rotation.z = side * 0.08;
    blade.castShadow = true;
    oar.position.set(side * 3.42, 1.44, 0.75);
    oar.rotation.z = side * 0.08;
    oar.add(shaft, blade);
  }
  group.add(hull, deck, bow, stern, seat, torso, head, hair, face, leftArm, rightArm, stripe, leftOar, rightOar);
  group.userData.oars = [leftOar, rightOar];
  return group;
}

function curveX(progress, track = TRACKS[state.selectedTrack]) {
  const bends = track.bends;
  const scaled = progress * (bends.length - 1);
  const i = Math.floor(scaled);
  const t = scaled - i;
  const a = bends[Math.max(0, Math.min(i, bends.length - 1))];
  const b = bends[Math.max(0, Math.min(i + 1, bends.length - 1))];
  const eased = t * t * (3 - 2 * t);
  const mirror = state.mirror ? -1 : 1;
  return (a + (b - a) * eased) * mirror;
}

function trackPos(distance, lateral = 0) {
  const wrapped = ((distance % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH;
  const progress = wrapped / TRACK_LENGTH;
  return new THREE.Vector3(curveX(progress) + lateral, 0, -wrapped);
}

function clearWorld() {
  while (world.children.length) world.remove(world.children[0]);
}

function buildTrack() {
  clearWorld();
  const track = TRACKS[state.selectedTrack];
  scene.background = new THREE.Color(track.name === "Moon Ferry" ? 0x2f4d78 : 0xaeddf0);
  scene.fog.color.copy(scene.background);

  for (let i = 0; i < 130; i++) {
    const z = -i * 48;
    const p = i / 129;
    const cx = curveX(p);
    const water = new THREE.Mesh(
      new THREE.BoxGeometry(90, 0.16, 50),
      mat(track.color, 0.2, { transparent: true, opacity: 0.88 })
    );
    water.position.set(cx, -0.04, z);
    water.receiveShadow = true;
    world.add(water);

    const leftBank = new THREE.Group();
    const rightBank = new THREE.Group();
    for (const [bank, side] of [[leftBank, -1], [rightBank, 1]]) {
      const grass = new THREE.Mesh(new THREE.BoxGeometry(34, 1.1, 50), mat(track.banks, 0.78));
      grass.position.set(side * 61, 0.8, 0);
      grass.receiveShadow = true;
      const soil = new THREE.Mesh(new THREE.BoxGeometry(10, 1.4, 50), mat(0x8a6848, 0.86));
      soil.position.set(side * 42, 0.34, 0);
      soil.rotation.z = side * 0.23;
      soil.receiveShadow = true;
      const lip = new THREE.Mesh(new THREE.BoxGeometry(4, 0.28, 50), mat(0xd6bd82, 0.74));
      lip.position.set(side * 37, 0.28, 0);
      lip.receiveShadow = true;
      bank.position.set(cx, 0, z);
      bank.add(grass, soil, lip);
      world.add(bank);
    }

    const foamOffset = i % 2 === 0 ? -18 : 18;
    const foam = new THREE.Mesh(new THREE.BoxGeometry(12, 0.045, 1.15), mat(0xf3ffff, 0.18, { transparent: true, opacity: 0.72 }));
    foam.position.set(cx + foamOffset, 0.08, z + 10);
    foam.rotation.y = (i % 3 - 1) * 0.18;
    world.add(foam);
    if (i % 3 === 0) {
      const ripple = new THREE.Mesh(new THREE.BoxGeometry(18, 0.035, 0.42), mat(0xffffff, 0.15, { transparent: true, opacity: 0.42 }));
      ripple.position.set(cx - foamOffset * 0.5, 0.09, z - 8);
      ripple.rotation.y = (i % 5 - 2) * 0.1;
      world.add(ripple);
    }

    if (i % 4 === 0) {
      const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.72, 2.5, 12), mat(0xe3b15c, 0.62));
      marker.position.set(cx - 39, 1.95, z);
      marker.castShadow = true;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 8), mat(0xff8fb7, 0.52));
      cap.scale.set(1.05, 0.56, 1.05);
      cap.position.set(cx - 39, 3.35, z);
      cap.castShadow = true;
      world.add(marker, cap);
    }
    if (i % 5 === 0) {
      for (let s = -1; s <= 1; s += 2) {
        const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8 + Math.random() * 0.6, 0), mat(0x7c8682, 0.88));
        stone.scale.set(1.4, 0.55, 0.95);
        stone.position.set(cx + s * (34 + Math.random() * 9), 0.25, z + (Math.random() - 0.5) * 22);
        stone.rotation.set(Math.random(), Math.random(), Math.random());
        stone.castShadow = true;
        stone.receiveShadow = true;
        world.add(stone);
      }
    }
    if (i % 7 === 0) {
      const reeds = new THREE.Group();
      for (let r = 0; r < 5; r++) {
        const height = 1.6 + Math.random();
        const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, height, 6), mat(0x6e9f50, 0.86));
        reed.position.set((Math.random() - 0.5) * 10, height / 2, (Math.random() - 0.5) * 18);
        reed.rotation.z = (Math.random() - 0.5) * 0.28;
        reeds.add(reed);
      }
      for (let f = 0; f < 3; f++) {
        const flower = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8), mat(track.flower, 0.58));
        flower.scale.set(0.45, 0.32, 0.45);
        flower.position.set((Math.random() - 0.5) * 12, 1.45 + Math.random() * 0.5, (Math.random() - 0.5) * 18);
        flower.castShadow = true;
        reeds.add(flower);
      }
      reeds.position.set(cx + (Math.random() > 0.5 ? 42 : -42), 1, z);
      world.add(reeds);
    }
    if (i % 11 === 0) {
      for (let s = -1; s <= 1; s += 2) {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 3.4, 10), mat(0x7a5134, 0.76));
        trunk.position.y = 1.7;
        trunk.castShadow = true;
        const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.9, 1), mat(0x5fa862, 0.72));
        crown.scale.set(1.25, 1.05, 1.25);
        crown.position.y = 4.05;
        crown.castShadow = true;
        tree.position.set(cx + s * (68 + Math.random() * 5), 1.05, z + (Math.random() - 0.5) * 20);
        tree.add(trunk, crown);
        world.add(tree);
      }
    }
  }

  const finish = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.BoxGeometry(82, 0.5, 2.3), mat(0xffd966, 0.48));
  bar.position.set(curveX(0), 1.5, -TRACK_LENGTH + 10);
  const ribbon = new THREE.Mesh(new THREE.BoxGeometry(18, 0.7, 2.5), mat(0xff8fb7, 0.52));
  ribbon.position.set(curveX(0), 2.1, -TRACK_LENGTH + 10);
  finish.add(bar, ribbon);
  world.add(finish);
}

function makeRacer(index, character, isPlayer) {
  const lane = LANES[index % LANES.length];
  const boat = makeBoat(character, isPlayer);
  world.add(boat);
  return {
    index,
    name: character.name,
    char: character,
    isPlayer,
    mesh: boat,
    distance: isPlayer ? 0 : -index * 8,
    lateral: lane,
    targetLateral: lane,
    speed: 0,
    maxSpeed: 48 * character.top,
    progress: 0,
    lap: 1,
    finished: false,
    finishTime: 0,
    drift: 0,
    drifting: false,
    boost: 0,
    spin: 0,
    steerLoss: 0,
    shield: 0,
    item: null,
    itemCooldown: 5 + Math.random() * 7,
    reaction: 0
  };
}

function startRace() {
  buildTrack();
  state.raceTime = 0;
  state.bannerUntil = 2.3;
  state.finished = false;
  state.splitTimes = [];
  const roster = [];
  const playerChar = CHARACTERS[state.selectedCharacter];
  roster.push(playerChar);
  const pool = CHARACTERS.filter((_, i) => state.clones || i !== state.selectedCharacter);
  for (let i = 1; i < 8; i++) roster.push(pool[(i - 1) % pool.length]);
  state.racers = roster.map((char, i) => makeRacer(i, char, i === 0));
  state.player = state.racers[0];
  showOnly("hud");
  setBanner("READY");
}

function showOnly(which) {
  for (const id of ["menu", "pause", "options", "hud"]) document.querySelector(`#${id}`).classList.toggle("hidden", id !== which && !(which === "race" && id === "hud"));
}

function formatTime(t) {
  const min = Math.floor(t / 60);
  const sec = Math.floor(t % 60).toString().padStart(2, "0");
  const hun = Math.floor((t % 1) * 100).toString().padStart(2, "0");
  return `${min}:${sec}.${hun}`;
}

function renderMenu() {
  const menu = document.querySelector("#menu");
  menu.innerHTML = `
    <div class="menu-shell">
      <div class="menu-top">
        <div>
          <h1>ROWING</h1>
          <p class="subtitle">Voxel river racing for one player against seven CPU rivals. Three laps, wide riverbeds, forgiving drift boosts, and item chaos that keeps the race moving.</p>
        </div>
        <button id="openOptions" class="icon-button" title="Options"><img src="${settingsIcon}" alt=""></button>
      </div>
      <div class="menu-grid">
        <div>
          <div class="section">
            <h3>Tracks</h3>
            <div class="tile-grid">${TRACKS.map((track, i) => `<button class="tile ${i === state.selectedTrack ? "active" : ""}" data-track="${i}"><strong>${i + 1}. ${track.name}</strong><span>${track.mood}</span></button>`).join("")}</div>
          </div>
          <div class="section">
            <h3>Characters</h3>
            <div class="tile-grid">${CHARACTERS.map((char, i) => `<button class="tile ${i === state.selectedCharacter ? "active" : ""}" data-character="${i}"><strong>${char.name}</strong><span>SPD ${Math.round(char.top * 100)} ACC ${Math.round(char.accel * 100)} DFT ${Math.round(char.drift * 100)}</span></button>`).join("")}</div>
          </div>
        </div>
        <div>
          <div class="section">
            <h3>Race Setup</h3>
            <div class="controls-grid">
              <div class="control-row"><span>Difficulty</span><div class="segmented">${Object.keys(DIFFICULTY).map(d => `<button data-difficulty="${d}" class="${state.difficulty === d ? "active" : ""}">${d}</button>`).join("")}</div></div>
              <div class="control-row"><span>Mirror Mode</span><button class="switch ${state.mirror ? "active" : ""}" data-toggle="mirror" title="Mirror Mode"></button></div>
              <div class="control-row"><span>Allow Clones</span><button class="switch ${state.clones ? "active" : ""}" data-toggle="clones" title="Allow Clones"></button></div>
            </div>
          </div>
          <div class="section">
            <h3>Boost Tiers</h3>
            <div class="controls-grid">
              <div class="control-row"><span>Level 1</span><strong>0.7s</strong></div>
              <div class="control-row"><span>Level 2</span><strong>1.1s</strong></div>
              <div class="control-row"><span>Level 3</span><strong>1.5s</strong></div>
            </div>
          </div>
          <div class="actions">
            <button id="startRace" class="primary">Start Race</button>
          </div>
        </div>
      </div>
    </div>`;
  menu.querySelectorAll("[data-track]").forEach(btn => btn.addEventListener("click", () => { state.selectedTrack = Number(btn.dataset.track); renderMenu(); }));
  menu.querySelectorAll("[data-character]").forEach(btn => btn.addEventListener("click", () => { state.selectedCharacter = Number(btn.dataset.character); renderMenu(); }));
  menu.querySelectorAll("[data-difficulty]").forEach(btn => btn.addEventListener("click", () => { state.difficulty = btn.dataset.difficulty; renderMenu(); }));
  menu.querySelectorAll("[data-toggle]").forEach(btn => btn.addEventListener("click", () => { state[btn.dataset.toggle] = !state[btn.dataset.toggle]; renderMenu(); }));
  menu.querySelector("#startRace").addEventListener("click", () => { state.screen = "race"; startRace(); });
  menu.querySelector("#openOptions").addEventListener("click", renderOptions);
}

function renderOptions() {
  state.screen = "options";
  const options = document.querySelector("#options");
  options.innerHTML = `
    <div class="options-panel">
      <h2>Options</h2>
      <div class="section">
        <div class="control-row"><span>Audio</span><button class="switch ${state.audio ? "active" : ""}" data-option="audio" title="Audio"></button></div>
        <div class="control-row"><span>Visual Style</span><div class="segmented"><button data-visual="Crisp" class="${state.visual === "Crisp" ? "active" : ""}">Crisp</button><button data-visual="Soft" class="${state.visual === "Soft" ? "active" : ""}">Soft</button></div></div>
      </div>
      <div class="actions"><button id="closeOptions" class="secondary">Back</button></div>
    </div>`;
  showOnly("options");
  options.querySelector("[data-option='audio']").addEventListener("click", () => { state.audio = !state.audio; renderOptions(); });
  options.querySelectorAll("[data-visual]").forEach(btn => btn.addEventListener("click", () => {
    state.visual = btn.dataset.visual;
    renderer.setPixelRatio(state.visual === "Crisp" ? Math.min(window.devicePixelRatio, 2) : 1);
    renderOptions();
  }));
  options.querySelector("#closeOptions").addEventListener("click", () => { state.screen = "menu"; showOnly("menu"); renderMenu(); });
}

function renderPause() {
  const pause = document.querySelector("#pause");
  pause.innerHTML = `
    <div class="pause-panel">
      <h2>${state.finished ? "Race Complete" : "Paused"}</h2>
      <div id="finishList" class="finish-list"></div>
      <div class="actions">
        ${state.finished ? "" : `<button id="resumeRace" class="primary">Resume</button>`}
        <button id="restartRace" class="secondary">Restart</button>
        <button id="quitRace" class="secondary">Quit</button>
      </div>
    </div>`;
  const list = pause.querySelector("#finishList");
  const ordered = [...state.racers].sort((a, b) => progressValue(b) - progressValue(a));
  list.innerHTML = ordered.map((r, i) => `<div class="finish-row"><strong>${i + 1}</strong><span>${r.name}${r.isPlayer ? " (You)" : ""}</span><span>${r.finished ? formatTime(r.finishTime) : `Lap ${r.lap}`}</span></div>`).join("");
  if (!state.finished) pause.querySelector("#resumeRace").addEventListener("click", () => { state.screen = "race"; showOnly("race"); });
  pause.querySelector("#restartRace").addEventListener("click", () => { state.screen = "race"; startRace(); });
  pause.querySelector("#quitRace").addEventListener("click", () => { state.screen = "menu"; showOnly("menu"); renderMenu(); });
  showOnly("pause");
}

function progressValue(r) {
  return r.distance + (r.lap - 1) * TRACK_LENGTH;
}

function setBanner(text, duration = 1.3) {
  const banner = document.querySelector("#banner");
  banner.textContent = text;
  banner.classList.add("show");
  state.bannerUntil = Math.max(state.bannerUntil, state.raceTime + duration);
}

function chooseItem(rank) {
  const ratio = (rank - 1) / 7;
  const weighted = ITEMS.map(item => ({ item, w: item.ahead * (1 - ratio) + item.behind * ratio }));
  const total = weighted.reduce((sum, entry) => sum + entry.w, 0);
  let roll = Math.random() * total;
  for (const entry of weighted) {
    roll -= entry.w;
    if (roll <= 0) return entry.item;
  }
  return ITEMS[0];
}

function useItem(user) {
  if (!user.item) return;
  const target = [...state.racers].filter(r => r !== user && !r.finished).sort((a, b) => Math.abs(progressValue(a) - progressValue(user)) - Math.abs(progressValue(b) - progressValue(user)))[0];
  const item = user.item;
  user.item = null;
  if (item.name === "Reed Shield") {
    user.shield = 5;
    return;
  }
  if (item.name === "Pocket Current" || item.name === "Compass Skip") {
    user.boost = Math.max(user.boost, item.name === "Pocket Current" ? 1.4 : 0.9);
    user.speed += item.name === "Pocket Current" ? 16 : 10;
    return;
  }
  if (!target || target.shield > 0) return;
  if (item.name === "Bubble Nudge" || item.name === "Foam Pop") target.spin = Math.min(1.2, item.name === "Foam Pop" ? 1.0 : 0.7);
  if (item.name === "Wake Fan" || item.name === "Tin Whistle") target.steerLoss = Math.min(0.6, item.name === "Tin Whistle" ? 0.55 : 0.4);
  if (item.name === "Duck Buoy") target.speed *= 0.86;
}

function updatePlayer(dt) {
  const p = state.player;
  const char = p.char;
  const forward = state.keys.has("arrowup") || state.keys.has("w");
  const back = state.keys.has("arrowdown") || state.keys.has("s");
  const left = state.keys.has("arrowleft") || state.keys.has("a");
  const right = state.keys.has("arrowright") || state.keys.has("d");
  const driftKey = state.keys.has(" ");
  const canSteer = p.steerLoss <= 0;
  const targetMax = p.maxSpeed + (p.boost > 0 ? 19 : 0);
  const riverDrag = p.boost > 0 ? 0.5 : 1;
  if (forward) p.speed += 34 * char.accel * dt;
  if (back) p.speed -= 26 * dt;
  p.speed -= 7.2 * riverDrag * dt;
  p.speed = THREE.MathUtils.clamp(p.speed, 8, targetMax);
  const steer = (right ? 1 : 0) - (left ? 1 : 0);
  if (canSteer) p.lateral += steer * (driftKey ? 27 : 19) * dt;
  p.lateral = THREE.MathUtils.clamp(p.lateral, -31, 31);
  const turning = Math.abs(steer) > 0.1 && p.speed > 22;
  if (driftKey && turning) {
    p.drifting = true;
    p.drift += dt * char.drift;
    p.speed -= 2.2 * dt;
  } else {
    if (p.drifting) releaseDrift(p);
    p.drifting = false;
    p.drift = Math.max(0, p.drift - dt * 1.6);
  }
}

function releaseDrift(r) {
  let boost = 0;
  if (r.drift >= 1.5) boost = 1.9;
  else if (r.drift >= 1.1) boost = 1.35;
  else if (r.drift >= 0.7) boost = 0.85;
  if (boost) {
    r.boost = Math.max(r.boost, boost);
    r.speed += 12 + boost * 5;
  }
}

function updateAI(r, dt, rank) {
  const diff = DIFFICULTY[state.difficulty];
  const progress = ((r.distance % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH / TRACK_LENGTH;
  r.reaction -= dt;
  if (r.reaction <= 0) {
    const bendNow = curveX(progress);
    const bendAhead = curveX((progress + 0.06) % 1);
    const turn = bendAhead - bendNow;
    const overtake = rank > 3 ? (Math.random() - 0.5) * 18 : 0;
    r.targetLateral = THREE.MathUtils.clamp(-turn * 0.35 + overtake, -29, 29);
    r.reaction = diff.reaction + Math.random() * 0.25;
    if (Math.abs(turn) > 24 && r.speed > 28) r.drift += 0.25;
  }
  r.lateral += (r.targetLateral - r.lateral) * Math.min(1, dt * 2.8);
  const catchup = r.distance < state.player.distance - 220 ? 1.06 : 1;
  const target = r.maxSpeed * diff.aiSpeed * catchup + (r.boost > 0 ? 16 : 0);
  r.speed += (target - r.speed) * dt * (0.8 + r.char.accel * 0.8);
  if (r.drift >= 1.1) {
    releaseDrift(r);
    r.drift = 0;
  }
  r.itemCooldown -= dt;
  if (!r.item && r.itemCooldown <= 0) {
    r.item = chooseItem(rank);
    r.itemCooldown = 8 + Math.random() * 8;
  }
  if (r.item && Math.random() < dt * 0.12) useItem(r);
}

function updateRacer(r, dt) {
  r.boost = Math.max(0, r.boost - dt);
  r.spin = Math.max(0, r.spin - dt);
  r.steerLoss = Math.max(0, r.steerLoss - dt);
  r.shield = Math.max(0, r.shield - dt);
  const oldLap = Math.floor(r.distance / TRACK_LENGTH) + 1;
  const spinDrag = r.spin > 0 ? 0.66 : 1;
  r.distance += r.speed * spinDrag * dt;
  const newLap = Math.floor(r.distance / TRACK_LENGTH) + 1;
  r.lap = Math.min(LAPS, newLap);
  if (r.isPlayer && newLap > oldLap && newLap <= LAPS) {
    state.splitTimes.push(state.raceTime);
    setBanner(newLap === LAPS ? "FINAL LAP" : `LAP ${newLap}`);
  }
  if (!r.finished && r.distance >= TRACK_LENGTH * LAPS) {
    r.finished = true;
    r.finishTime = state.raceTime;
    r.speed *= 0.5;
    if (r.isPlayer) {
      state.finished = true;
      setBanner("FINISH", 3);
      setTimeout(() => {
        state.screen = "pause";
        renderPause();
      }, 900);
    }
  }
  const pos = trackPos(r.distance, r.lateral);
  r.mesh.position.set(pos.x, 0, pos.z);
  const ahead = trackPos(r.distance + 18, r.lateral);
  r.mesh.lookAt(ahead.x, 0, ahead.z);
  if (r.spin > 0) r.mesh.rotation.y += Math.sin(state.raceTime * 26) * 0.18;
  const oarSwing = Math.sin(state.raceTime * (r.boost > 0 ? 17 : 11)) * 0.34;
  r.mesh.userData.oars.forEach((oar, i) => { oar.rotation.y = (i ? -1 : 1) * oarSwing; });
}

function updateCamera(dt) {
  const p = state.player;
  const pos = trackPos(p.distance - 28, p.lateral);
  const target = new THREE.Vector3(pos.x, 18, pos.z + 38);
  camera.position.lerp(target, 1 - Math.pow(0.001, dt));
  const look = trackPos(p.distance + 58, p.lateral * 0.5);
  camera.lookAt(look.x, 3, look.z);
}

function updateHUD() {
  const ordered = [...state.racers].sort((a, b) => progressValue(b) - progressValue(a));
  const rank = ordered.indexOf(state.player) + 1;
  document.querySelector("#rank").textContent = `${rank}/8`;
  document.querySelector("#lap").textContent = `${Math.min(LAPS, state.player.lap)}/${LAPS}`;
  document.querySelector("#timer").textContent = formatTime(state.raceTime);
  const p = state.player;
  document.querySelector("#driftMeter").style.width = `${Math.min(100, p.drift / 1.5 * 100)}%`;
  const item = p.item;
  document.querySelector("#itemSlot").innerHTML = `<span class="item-icon">${item ? item.icon : "--"}</span><span class="item-name">${item ? item.name : "No Item"}</span>`;
  const banner = document.querySelector("#banner");
  banner.classList.toggle("show", state.raceTime < state.bannerUntil);
  drawMinimap(ordered);
}

function drawMinimap(ordered) {
  const canvas = document.querySelector("#minimap");
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  ctx.clearRect(0, 0, w, w);
  ctx.strokeStyle = "rgba(255,255,255,0.32)";
  ctx.lineWidth = 8;
  ctx.beginPath();
  for (let i = 0; i <= 80; i++) {
    const p = i / 80;
    const x = w / 2 + curveX(p) * 1.2;
    const y = 12 + p * (w - 24);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ordered.forEach(r => {
    const p = (((r.distance % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH) / TRACK_LENGTH;
    const x = w / 2 + curveX(p) * 1.2 + r.lateral * 0.22;
    const y = 12 + p * (w - 24);
    ctx.fillStyle = r.isPlayer ? "#f6ce5f" : "#f4f7f4";
    ctx.fillRect(x - 3, y - 3, 6, 6);
  });
}

function tick(time) {
  requestAnimationFrame(tick);
  const now = time / 1000;
  const dt = Math.min(0.033, now - (state.lastTime || now));
  state.lastTime = now;
  if (state.screen === "race" && !state.finished) {
    state.raceTime += dt;
    const ranked = [...state.racers].sort((a, b) => progressValue(b) - progressValue(a));
    updatePlayer(dt);
    state.racers.forEach(r => {
      const rank = ranked.indexOf(r) + 1;
      if (!r.isPlayer) updateAI(r, dt, rank);
      updateRacer(r, dt);
    });
    if (!state.player.item && Math.floor(state.player.distance / 420) > Math.floor((state.player.distance - state.player.speed * dt) / 420)) {
      state.player.item = chooseItem(ranked.indexOf(state.player) + 1);
    }
    updateCamera(dt);
    updateHUD();
  }
  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();
  state.keys.add(key);
  if (key === "escape") {
    if (state.screen === "race") {
      state.screen = "pause";
      renderPause();
    } else if (state.screen === "pause") {
      state.screen = "race";
      showOnly("race");
    }
  }
  if (key === "e" && state.screen === "race") useItem(state.player);
});

window.addEventListener("keyup", event => {
  state.keys.delete(event.key.toLowerCase());
});

renderMenu();
buildTrack();
camera.position.set(0, 24, 52);
camera.lookAt(0, 0, -40);
requestAnimationFrame(tick);
