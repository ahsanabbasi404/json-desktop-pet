import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 1.0, 8.8);
camera.lookAt(0, 0.95, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const key = new THREE.DirectionalLight(0xfff2e0, 2.4); key.position.set(-3, 5, 4); scene.add(key);
const rim = new THREE.DirectionalLight(0xcfe0ff, 1.2); rim.position.set(3, 2, -4); scene.add(rim);

const base = new THREE.Group();
scene.add(base);


const clock = new THREE.Clock();
let rig = null, BASE_S = 1;
const P = {};
const MATS = [];
function grab(n) { const o = rig.getObjectByName(n); if (o) P[n] = { o, p: o.position.clone(), s: o.scale.clone() }; }

let activeAt = 0;
let move = null;
let firstMove = true;
const IDLE_TRIGGER = 6.5;
const MOVES = ['spin', 'backflip', 'dance', 'flex', 'glitch'];
const DUR = { spin: 1.5, backflip: 1.3, dance: 2.8, flex: 1.7, glitch: 1.9, heroland: 1.8 };

new GLTFLoader().load('./mascot.glb', (g) => {
  rig = g.scene;
  const box = new THREE.Box3().setFromObject(rig);
  const size = new THREE.Vector3(); box.getSize(size);
  const center = new THREE.Vector3(); box.getCenter(center);
  rig.position.sub(center);
  BASE_S = 2.35 / size.y;
  base.add(rig);
  base.position.y = 0.95;
  base.scale.setScalar(BASE_S);
  ['Hand_1', 'Hand_-1', 'Foot_1', 'Foot_-1', 'Eye_0.34', 'Eye_-0.34'].forEach(grab);
  rig.traverse(o => {
    if (o.isMesh && o.material) {
      const m = o.material;
      if (!MATS.includes(m)) {
        m.userData._em = (m.emissive || new THREE.Color(0, 0, 0)).clone();
        m.userData._ei = (m.emissiveIntensity !== undefined ? m.emissiveIntensity : 1);
        MATS.push(m);
      }
    }
  });
  activeAt = clock.getElapsedTime() - IDLE_TRIGGER + 0.8; // "hello" move shortly after launch
}, undefined, (e) => console.error('GLB load failed', e));

let cur = { dx: -84, dy: -68, speed: 0 };
if (window.pet) window.pet.onCursor((d) => { cur = d; });
if (window.pet && window.pet.onPlay) window.pet.onPlay((name) => {
  const n = (name === 'random') ? MOVES[Math.floor(Math.random() * MOVES.length)] : name;
  if (DUR[n]) { firstMove = false; move = { name: n, start: clock.getElapsedTime(), dur: DUR[n], forced: true }; }
});

// boom entry state (the main process drops the window from above the screen)
let entryMode = null;
if (window.pet && window.pet.onEntry) window.pet.onEntry((d) => {
  if (d.mode === 'fall') { entryMode = 'fall'; move = null; tintRed(0); firstMove = false; }
  else if (d.mode === 'land') {
    entryMode = null;
    move = { name: 'heroland', start: clock.getElapsedTime(), dur: DUR.heroland, forced: true };
  } else if (d.mode === 'end') { entryMode = null; }
});

let runAmt = 0, hopT = -10;

function setY(n, y) { if (P[n]) P[n].o.position.y = P[n].p.y + y; }
function setZ(n, z) { if (P[n]) P[n].o.position.z = P[n].p.z + z; }
function restLimbs() { ['Hand_1', 'Hand_-1', 'Foot_1', 'Foot_-1'].forEach(n => { if (P[n]) P[n].o.position.copy(P[n].p); }); }
function setBaseScale(sq) { base.scale.set(BASE_S * (1 + sq * 0.5), BASE_S * (1 - sq), BASE_S * (1 + sq * 0.5)); }
const easeIO = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
function blink(t) { const bc = t % 3.4; let sy = 1; if (bc < 0.13) sy = 1 - Math.sin(bc / 0.13 * Math.PI) * 0.9; ['Eye_0.34', 'Eye_-0.34'].forEach(n => { if (P[n]) P[n].o.scale.y = P[n].s.y * sy; }); }
function tintRed(amt) {
  for (const m of MATS) {
    if (amt <= 0) { m.emissive.copy(m.userData._em); m.emissiveIntensity = m.userData._ei; }
    else { m.emissive.setRGB(1, 0.05, 0.05); m.emissiveIntensity = amt * 2.2; }
  }
}

function playMove(name, p) {
  base.rotation.set(0, 0, 0);
  restLimbs();
  if (name === 'spin') {
    const q = THREE.MathUtils.clamp((p - 0.12) / 0.76, 0, 1);
    base.position.y = 0.95 + Math.sin(q * Math.PI) * 0.6;
    base.rotation.y = easeIO(q) * Math.PI * 2;
    let sq = 0; if (p < 0.12) sq = (p / 0.12) * 0.2; else if (p > 0.9) sq = ((p - 0.9) / 0.1) * 0.2;
    setBaseScale(sq);
  } else if (name === 'backflip') {
    const q = THREE.MathUtils.clamp((p - 0.1) / 0.8, 0, 1);
    base.position.y = 0.95 + Math.sin(q * Math.PI) * 0.9;
    base.rotation.x = -easeIO(q) * Math.PI * 2;
    let sq = 0; if (p < 0.1) sq = (p / 0.1) * 0.22; else if (p > 0.9) sq = ((p - 0.9) / 0.1) * 0.22;
    setBaseScale(sq);
  } else if (name === 'dance') {
    base.rotation.z = Math.sin(p * Math.PI * 6) * 0.22;
    base.rotation.y = Math.sin(p * Math.PI * 4) * 0.5;
    base.position.y = 0.95 + Math.abs(Math.sin(p * Math.PI * 8)) * 0.12;
    setBaseScale(0.03 * Math.sin(p * Math.PI * 8));
    setY('Hand_1', 0.22 + 0.15 * Math.sin(p * Math.PI * 8));
    setY('Hand_-1', 0.22 + 0.15 * Math.sin(p * Math.PI * 8 + Math.PI));
  } else if (name === 'flex') {
    if (p < 0.22) { setBaseScale((p / 0.22) * 0.24); base.position.y = 0.95; }
    else {
      const e = (p - 0.22) / 0.78;
      const pop = Math.sin(Math.min(e * 1.6, 1) * Math.PI / 2);
      base.position.y = 0.95 + pop * 0.12;
      setBaseScale(-pop * 0.08);
      setY('Hand_1', pop * 0.5); setY('Hand_-1', pop * 0.5);
      base.rotation.z = Math.sin(e * Math.PI * 10) * 0.05 * (1 - e);
    }
  } else if (name === 'glitch') {
    // "Unexpected token < in JSON at position 0" — corrupt, crash, and reform
    if (p < 0.14) {                                   // tension before it breaks
      const e = p / 0.14;
      base.rotation.x = -0.12 * e;
      base.position.y = 0.95 + 0.05 * e;
      setBaseScale(-0.05 * e);
      tintRed(0);
    } else if (p < 0.72) {                            // GLITCH: jitter + red flicker + scatter
      const e = (p - 0.14) / 0.58;
      const it = 0.45 + 0.55 * Math.sin(e * Math.PI);
      base.position.set((Math.random() - 0.5) * 0.18 * it, 0.95 + (Math.random() - 0.5) * 0.18 * it, 0);
      base.rotation.set((Math.random() - 0.5) * 0.2 * it, (Math.random() - 0.5) * 0.3 * it, (Math.random() - 0.5) * 0.25 * it);
      const sf = (Math.random() - 0.5) * 0.25 * it;
      base.scale.set(BASE_S * (1 + sf), BASE_S * (1 - sf * 0.6), BASE_S * (1 + sf));
      ['Hand_1', 'Hand_-1', 'Foot_1', 'Foot_-1'].forEach(n => {
        if (P[n]) P[n].o.position.set(P[n].p.x + (Math.random() - 0.5) * 0.16 * it, P[n].p.y + (Math.random() - 0.5) * 0.16 * it, P[n].p.z + (Math.random() - 0.5) * 0.12 * it);
      });
      tintRed((Math.random() > 0.35 ? 1 : 0.15) * it);
    } else if (p < 0.82) {                            // crash / collapse
      const e = (p - 0.72) / 0.10;
      base.position.set(0, 0.95 - 0.1 * e, 0);
      setBaseScale(0.35 * e);
      tintRed((1 - e) * 0.5);
    } else {                                          // reform with a relieved bounce
      const e = (p - 0.82) / 0.18;
      const pop = Math.sin(e * Math.PI);
      base.position.set(0, 0.95 + pop * 0.12, 0);
      setBaseScale(0.35 * (1 - e) - pop * 0.1);
      tintRed(0);
    }
  } else if (name === 'heroland') {
    // superhero landing: deep crouch, fist to the ground, hold the beat, slow dramatic rise
    if (p < 0.16) {
      const e = p / 0.16;
      base.position.y = 0.95 - 0.16 * e;
      setBaseScale(0.34 * e);
      base.rotation.x = 0.3 * e;
      setY('Hand_1', -0.32 * e); setZ('Hand_1', 0.22 * e);   // fist down, forward
      setY('Hand_-1', 0.35 * e);                              // other arm swept back-up
    } else if (p < 0.52) {
      base.position.y = 0.95 - 0.16;
      setBaseScale(0.34);
      base.rotation.x = 0.3;
      setY('Hand_1', -0.32); setZ('Hand_1', 0.22);
      setY('Hand_-1', 0.35);
    } else {
      const e = easeIO((p - 0.52) / 0.48);
      base.position.y = 0.95 - 0.16 * (1 - e) + Math.sin(e * Math.PI) * 0.06;
      setBaseScale(0.34 * (1 - e) - Math.sin(e * Math.PI) * 0.05);
      base.rotation.x = 0.3 * (1 - e) - 0.08 * Math.sin(e * Math.PI);
      setY('Hand_1', -0.32 * (1 - e) + 0.4 * Math.sin(e * Math.PI)); setZ('Hand_1', 0.22 * (1 - e));
      setY('Hand_-1', 0.35 * (1 - e) + 0.4 * Math.sin(e * Math.PI));
    }
  }
}

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  if (rig) {
    // boom entry: the window plummets from the sky; pose the pet as a superhero dive
    if (entryMode === 'fall') {
      base.position.set(0, 0.95, 0);
      base.scale.setScalar(BASE_S);
      restLimbs();
      base.rotation.set(0.35, 0, Math.sin(t * 22) * 0.05);  // leaning into the dive, slight wobble
      setY('Hand_1', -0.45); setZ('Hand_1', 0.15);           // fist down, leading the fall
      setY('Hand_-1', 0.5);                                  // other arm trailing above
      setY('Foot_1', 0.12); setY('Foot_-1', 0.18);           // legs trailing up
      blink(t);
      renderer.render(scene, camera);
      return;
    }

    const dist = Math.hypot(cur.dx, cur.dy);
    const targetRun = THREE.MathUtils.clamp((cur.speed - 1.5) / 5.0, 0, 1);
    runAmt += (targetRun - runAmt) * 0.12;

    const activeNow = cur.speed > 2.2;
    if (activeNow) { activeAt = t; if (move && !move.forced) { move = null; tintRed(0); } }

    if (!move && !activeNow && runAmt < 0.05 && (t - activeAt) > IDLE_TRIGGER) {
      const name = firstMove ? 'glitch' : MOVES[Math.floor(Math.random() * MOVES.length)];
      firstMove = false;
      move = { name, start: t, dur: DUR[name] };
    }

    if (move) {
      const p = (t - move.start) / move.dur;
      if (p >= 1) { move = null; activeAt = t; tintRed(0); }
      else { playMove(move.name, p); blink(t); renderer.render(scene, camera); return; }
    }

    // ---- normal follow / run / idle ----
    const idle = 1 - runAmt;
    const yaw = THREE.MathUtils.clamp(cur.dx / 230, -0.85, 0.85);
    const pitch = THREE.MathUtils.clamp(cur.dy / 260, -0.4, 0.5);
    base.rotation.z += (0 - base.rotation.z) * 0.2;
    base.rotation.y += (yaw - base.rotation.y) * 0.18;
    const leanX = pitch * 0.28 + runAmt * 0.20;
    base.rotation.x += (leanX - base.rotation.x) * 0.18;

    const bob = Math.sin(t * 3.0) * 0.045 * idle + Math.abs(Math.sin(t * 11)) * 0.11 * runAmt;
    if (dist < 95 && (t - hopT) > 1.8) hopT = t;
    let hop = 0, squash = 0; const ht = t - hopT;
    if (ht >= 0 && ht < 0.5) { const pp = ht / 0.5; hop = Math.sin(pp * Math.PI) * 0.4; squash = Math.sin(pp * Math.PI) * 0.1; }
    base.position.y = 0.95 + bob + hop;
    setBaseScale(squash);

    const F = 11, a = Math.sin(t * F), b = Math.sin(t * F + Math.PI);
    setY('Foot_1', Math.max(0, a) * 0.20 * runAmt);
    setY('Foot_-1', Math.max(0, b) * 0.20 * runAmt);
    setZ('Foot_1', a * 0.14 * runAmt);
    setZ('Foot_-1', b * 0.14 * runAmt);
    const handBob = Math.sin(t * 3 + 1) * 0.03;
    let waveR = 0; const wc = t % 6; if (idle > 0.5 && wc < 1.3) { const e = wc / 1.3; waveR = Math.sin(e * Math.PI) * 0.42; }
    setY('Hand_1', (handBob + waveR) * idle + b * 0.11 * runAmt);
    setY('Hand_-1', handBob * idle + a * 0.11 * runAmt);

    blink(t);
  }

  renderer.render(scene, camera);
}
animate();

// keep pixels-per-world-unit constant so the pet stays the same size when the
// window is enlarged for the hero entry (the extra height shows more rope instead)
const PPU = 320 / (2 * 8.8 * Math.tan(THREE.MathUtils.degToRad(15)));
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.fov = 2 * THREE.MathUtils.radToDeg(Math.atan(innerHeight / PPU / 2 / 8.8));
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
