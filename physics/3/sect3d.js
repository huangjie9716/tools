// ================================================================

// sect3d.js — 江湖地图 3D 微缩沙盘（Three.js r128 UMD）
// 深夜武侠门派俯瞰沙盘：藏经阁 / 百草园 / 演武场 / 问道崖
// 依赖：three.min.js（全局 THREE）+ OrbitControls.js（全局）
// ================================================================
/* global THREE */

// ================= 颜色常量 =================
const C = {
  ground: 0x0f172a,
  woodDark: 0x5c3a21,
  wood: 0x6b4c35,
  woodLight: 0x7a5c45,
  roof: 0x3d3d3d,
  grass: 0x1a472a,
  stem: 0x4ade80,
  leaf: 0x22c55e,
  stone: 0x4a4a4a,
  stoneLight: 0x6b6b6b,
  rail: 0x7f1d1d,
  flag: 0xdc2626,
  metal: 0xc0c0c0,
  rock: 0x2d2d2d,
  rockDark: 0x252525,
  cliffTop: 0x4a4a4a,
  window: 0xfbbf24,
  windowEmissive: 0xf59e0b,
  gold: 0xfbbf24
};

const IS_MOBILE = window.innerWidth < 720;

// ================= 全局 =================
let scene, camera, renderer, controls, clock;
const buildings = [];       // { type, group, locked, baseY, label }
const windowTiers = [];     // 藏经阁三层窗户（每层 { meshes, lights }）
const herbs = [];           // 百草园药草（用于摇摆动画）
const herbHeights = [];
const clouds = [];          // 问道崖云雾
const cloudSeeds = [];
const fireflies = [];       // 百草园萤火虫
const fireflySeeds = [];
const fallingLeaves = [];   // 全景落叶
const flowers = [];         // 百草园小花
let stars = null;           // 星空粒子系统
let moonMesh = null;        // 月亮
let hangingLanterns = [];   // 藏经阁 / 建筑灯笼（动画）

let libraryProgress = 0;
let libraryTotal = 17;
let levelProgress = 0;

// 交互（THREE 未加载时为空，不影响其余游戏逻辑；init() 内已兜底）
const raycaster = typeof THREE !== 'undefined' ? new THREE.Raycaster() : null;
const pointer = typeof THREE !== 'undefined' ? new THREE.Vector2() : null;
let hovered = null;         // 当前悬停建筑
let tagEl = null;           // 名称标签
let tagTarget = null;
let flightAnim = null;      // 点击建筑时的平滑飞行
let userInteracted = false; // 是否已手动交互

// ================= 初始化 =================
function init() {
    const container = document.getElementById('sect3d-container');
  if (!container) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1024);
  scene.fog = new THREE.FogExp2(0x10152e, 0.018);

  // 主界面初始可能处于隐藏状态（display:none），此时容器尺寸为 0，需回退到窗口尺寸
  const w = container.clientWidth || window.innerWidth;
  const h = container.clientHeight || window.innerHeight;
  camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 500);
  // 初始相机放远，供进场动画推进
  camera.position.set(0, 26, 42);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.minPolarAngle = Math.PI / 6;   // 30°
  controls.maxPolarAngle = Math.PI / 3;   // 60°
  controls.minDistance = 10;
  controls.maxDistance = 35;
  controls.enablePan = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.35;

  // 用户一旦开始手动操作（拖拽旋转 / 触摸），立即终止飞行动画，把相机控制权交还 OrbitControls
  controls.addEventListener('start', () => { flightAnim = null; });

  clock = new THREE.Clock();

    setupLights();
  createSky();
  createGround();
  createPaths();
  createFallingLeaves();

    buildings.push(createCangjingge());
  buildings.push(createBaicaoyuan());
  buildings.push(createYanwuchang());
  buildings.push(createWendaoya());
  // 把建筑加入场景（否则不会被渲染！）并记录基准坐标、设置射线检测标识
  buildings.forEach(b => {
    scene.add(b.group);
    b.baseX = b.group.position.x;
    b.baseZ = b.group.position.z;
    b.group.userData._sect = b;
    createFoundation(b);
    createHoverRing(b);
  });

  createEnvironment();

  // 名称标签（HTML 覆盖层）
  tagEl = document.createElement('div');
  tagEl.className = 'sect3d-tag';
  document.body.appendChild(tagEl);

  // 事件
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('wheel', onUserInteract, { passive: true });
  window.addEventListener('resize', onResize);

    // 进场相机动画：从远（z≈42）推进到近景
  flightAnim = {
    camFrom: camera.position.clone(),
    camTo: new THREE.Vector3(0, 17, 21),
    tgtFrom: new THREE.Vector3(0, 0, 0),
    tgtTo: new THREE.Vector3(0, 0, 0),
    start: clock.getElapsedTime(),
    dur: 2.4   // 单位：秒（与 clock.getElapsedTime() 一致，2.4 秒完成进场）
  };

  animate();
}

function onUserInteract() {
  userInteracted = true;
  // 用户滚轮 / 触摸交互时，立即取消进行中的飞行动画，避免动画每帧覆盖相机位置
  if (flightAnim) {
    flightAnim = null;
  }
}

// ================= 灯光 =================
function setupLights() {
  // 环境光：偏冷的中性底光
  scene.add(new THREE.AmbientLight(0x2a3a5f, 0.35));

  // 半天空光：给阴影一点蓝色反光，避免死黑
  const hemi = new THREE.HemisphereLight(0x4169e1, 0x0f172a, 0.35);
  scene.add(hemi);

  // 主月光：加强 + 略微暖色，模拟月光洒落
  const moon = new THREE.DirectionalLight(0xe0e7ff, 1.5);
  moon.position.set(12, 20, 8);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.near = 1;
  moon.shadow.camera.far = 60;
  moon.shadow.camera.left = -25;
  moon.shadow.camera.right = 25;
  moon.shadow.camera.top = 25;
  moon.shadow.camera.bottom = -25;
  moon.shadow.bias = -0.001;
  scene.add(moon);

    // 一处柔和的补光，照亮建筑正面细节
  const fill = new THREE.PointLight(0x4a3c8c, 0.5, 40);
  fill.position.set(-10, 8, -10);
  scene.add(fill);
}

// ================= 星空 + 月亮 =================
function createSky() {
  // 星空粒子
  const count = IS_MOBILE ? 260 : 600;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 90 + Math.random() * 120;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.6 + 0.05);
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.cos(phi);
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.7,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false
  });
  stars = new THREE.Points(geo, starMat);
  scene.add(stars);

  // 月亮（装饰球，淡黄色自发光，不实际照亮）
  moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(3.5, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff4c2 })
  );
  moonMesh.position.set(38, 34, -52);
  scene.add(moonMesh);
  // 月亮光晕
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24),
    new THREE.MeshBasicMaterial({
      color: 0xfff7cc,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  halo.position.set(38, 34, -53);
  scene.add(halo);
}

// ================= 地基：让建筑扎根地面 =================
function createFoundation(b) {
  const f = new THREE.Mesh(
    new THREE.BoxGeometry(8, 0.4, 8),
    new THREE.MeshStandardMaterial({ color: 0x1a2438, roughness: 0.9 })
  );
  f.position.set(b.baseX, -0.3, b.baseZ);
  f.receiveShadow = true;
  scene.add(f);
}

// ================= 悬停光晕环（淡金色） =================
function createHoverRing(b) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.7, 2.5, 40),
    new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(b.baseX, 0.06, b.baseZ);
  scene.add(ring);
  b.hoverRing = ring;
}

// ================= 环境：离散树木 =================
function createEnvironment() {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3226, roughness: 0.9 });
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x1c3a24, roughness: 0.9 });
  const spots = IS_MOBILE ? 8 : 14;
  for (let i = 0; i < spots; i++) {
    const a = (i / spots) * Math.PI * 2 + 0.4;
    const r = 22 + Math.random() * 12;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (Math.abs(x) < 13 && Math.abs(z) < 15) continue;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 3, 6), trunkMat);
    trunk.position.set(x, 1.5, z);
    trunk.castShadow = true;
    scene.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(1.7, 2.6, 7), crownMat);
    crown.position.set(x, 3.8, z);
    crown.castShadow = true;
    scene.add(crown);
  }
}

// 落叶：黄色薄片，从高空缓缓飘落
function createFallingLeaves() {
  const count = IS_MOBILE ? 4 : 7;
  const leafGeo = new THREE.PlaneGeometry(0.18, 0.12);
  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xd9a534,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const leaf = new THREE.Mesh(leafGeo, mat);
    leaf.position.set(
      (Math.random() * 2 - 1) * 26,
      10 + Math.random() * 12,
      (Math.random() * 2 - 1) * 22
    );
    leaf.rotation.y = Math.random() * Math.PI;
    scene.add(leaf);
    fallingLeaves.push({
      mesh: leaf,
      vx: (Math.random() * 2 - 1) * 0.4,
      vy: -0.6 - Math.random() * 0.5,
      seed: Math.random() * 10
    });
  }
}

// ================= 地面（带起伏 + 草地纹理） =================
function createGround() {
  const groundGeo = new THREE.PlaneGeometry(90, 90, 28, 28);
  const pos = groundGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const dist = Math.sqrt(x * x + y * y);
    const amp = dist < 14 ? 0.04 : 0.3;
    pos.setZ(i, Math.sin(x * 0.45) * Math.cos(y * 0.4) * amp + (Math.random() - 0.5) * 0.1);
  }
  groundGeo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x141d33,
    roughness: 0.95,
    map: makeGrassTexture(),
    metalness: 0.02
  });
  mat.map.wrapS = mat.map.wrapT = THREE.RepeatWrapping;
  mat.map.repeat.set(10, 10);
  const ground = new THREE.Mesh(groundGeo, mat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.2;
  ground.receiveShadow = true;
  scene.add(ground);
}

// 在两点之间铺几块石板（带石板纹理）
function createPathSegment(x1, z1, x2, z2) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x5a5a5a,
    roughness: 0.75,
    map: makeStoneTexture()
  });
  mat.map.wrapS = mat.map.wrapT = THREE.RepeatWrapping;
  mat.map.repeat.set(2, 2);
  const dx = x2 - x1, dz = z2 - z1;
  const len = Math.sqrt(dx * dx + dz * dz);
  const dir = new THREE.Vector3(dx, 0, dz).normalize();
  const count = Math.max(2, Math.floor(len / 2.0));
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const stone = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.07, 1.0), mat);
    stone.position.set(x1 + dir.x * len * t, 0.02, z1 + dir.z * len * t);
    stone.rotation.y = Math.atan2(dir.x, dir.z);
    stone.receiveShadow = true;
    scene.add(stone);
  }
}

function createPaths() {
  createPathSegment(0, -2, -8, 3);    // 藏经阁 → 百草园
  createPathSegment(0, -2, 8, 3);     // 藏经阁 → 演武场
  createPathSegment(0, -2, 0, 10);    // 藏经阁 → 问道崖（最长）
}

// ================= 辅助 =================
// ---------- CanvasTexture 纹理生成工具 ----------
function makeCanvasTexture(draw, w = 256, h = 256) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
// 木纹：深浅交错棕色横线 + 弯曲细纹 + 节疤
function makeWoodTexture() {
  return makeCanvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#6b4c35';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 6) {
      ctx.fillStyle = Math.random() > 0.5 ? '#4e2f18' : '#8a6345';
      ctx.fillRect(0, y, w, 3 + Math.random() * 4);
    }
    for (let i = 0; i < 50; i++) {
      ctx.strokeStyle = `rgba(40,20,5,${0.15 + Math.random() * 0.35})`;
      ctx.lineWidth = (Math.random() * 1.4).toFixed(1);
      ctx.beginPath();
      const y = Math.random() * h;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * 0.33, y + (Math.random() - 0.5) * 4, w * 0.66, y + (Math.random() - 0.5) * 4, w, y);
      ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = `rgba(70,40,20,${0.2 + Math.random() * 0.3})`;
      ctx.beginPath();
      ctx.ellipse(Math.random() * w, Math.random() * h, 4 + Math.random() * 5, 2 + Math.random() * 3, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 128, 128);
}
// 噪声纹理（瓦片 / 石头凹凸感）
function makeNoiseTexture() {
  return makeCanvasTexture((ctx, w, h) => {
    const img = ctx.createImageData(w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + Math.floor(Math.random() * 80 - 40);
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, 64, 64);
}
// 石板路纹理：深灰底 + 浅灰缝隙线
function makeStoneTexture() {
  return makeCanvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#3d3d3d';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#575757';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
    ctx.beginPath();
    ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h / 2 - 5);
    ctx.moveTo(w / 2, h / 2 + 5); ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2); ctx.lineTo(w / 2 - 5, h / 2);
    ctx.moveTo(w / 2 + 5, h / 2); ctx.lineTo(w, h / 2);
    ctx.stroke();
    for (let i = 0; i < 100; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });
}
// 草地纹理（暗色 + 草叶直线）
function makeGrassTexture() {
  return makeCanvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#121a30';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) {
      ctx.strokeStyle = `rgba(${70 + Math.random() * 70},${120 + Math.random() * 80},${50 + Math.random() * 50},${0.35 + Math.random() * 0.45})`;
      ctx.lineWidth = 1;
      const x = Math.random() * w, y = Math.random() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 3, y - (2 + Math.random() * 5));
      ctx.stroke();
    }
  }, 256, 256);
}
// 比武旗纹理：深红底 + 金边 + 「武」字
function makeFlagTexture() {
  return makeCanvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 320; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.07})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    ctx.strokeStyle = '#f5d76e';
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = '#f5d76e';
    ctx.font = `bold ${Math.floor(h * 0.5)}px "STKaiti","KaiTi",serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('武', w / 2, h / 2 + 3);
  }, 128, 160);
}

// 预生成常用纹理（THREE 未加载时置空，不影响其余游戏逻辑）
const TEX = typeof THREE !== 'undefined'
    ? { wood: makeWoodTexture(), woodLight: makeWoodTexture(), noise: makeNoiseTexture() }
    : null;
if (TEX) TEX.woodLight.repeat.set(1, 1);

function box(w, h, d, color, opts = {}) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...opts })
  );
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function cyl(rt, rb, h, color, opts = {}) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(rt, rb, h, 12),
    new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts })
  );
  m.castShadow = true;
  return m;
}
// 四角飞檐屋顶（锥体，带瓦片噪声凹凸）
function roofCone(width, height, color) {
  const m = new THREE.Mesh(
    new THREE.ConeGeometry(width, height, 4),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.75,
      bumpMap: TEX.noise,
      bumpScale: 0.3
    })
  );
  m.castShadow = true;
  return m;
}
// 带木纹贴图的木盒
function woodBox(w, h, d, tex, color, opts = {}) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, map: tex, roughness: 0.7, ...opts })
  );
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
// 自发光小球（灯笼 / 火把 / 光球等）
function glowSphere(radius, color, position) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 12, 12),
    new THREE.MeshBasicMaterial({ color })
  );
  if (position) m.position.set(...position);
  return m;
}
// 点光源闪烁（火焰用）
function makeFlicker(color, intensity, dist) {
  const l = new THREE.PointLight(color, intensity, dist);
  l.userData.base = intensity;
  return l;
}

// ================= 藏经阁：三层中式阁楼 =================
function createCangjingge() {
  const group = new THREE.Group();
  group.position.set(0, 0, -2);

    // 底层主体（带木纹）
  const base = woodBox(6, 3, 4, TEX.wood, C.woodDark);
  base.position.y = 1.5;
  group.add(base);
  // 底层屋顶
  const roof1 = roofCone(4.6, 1.5, C.roof);
  roof1.position.y = 3.15;
  group.add(roof1);
    // 二层
  const floor2 = woodBox(4.5, 2.5, 3, TEX.wood, C.wood);
  floor2.position.y = 5;
  group.add(floor2);
  const roof2 = roofCone(3.6, 1.2, C.roof);
  roof2.position.y = 6.25;
  group.add(roof2);
    // 三层
  const floor3 = woodBox(3, 2, 2, TEX.woodLight, C.woodLight);
  floor3.position.y = 7.75;
  group.add(floor3);
  const roof3 = roofCone(2.6, 1, C.roof);
  roof3.position.y = 8.75;
  group.add(roof3);

  // 大门
  const door = box(1.2, 1.8, 0.12, 0x1a1a1a);
  door.position.set(0, 0.9, 2.01);
  group.add(door);
  // 牌匾
  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 0.6),
    new THREE.MeshBasicMaterial({ color: 0xfff3c4 })
  );
  plaque.position.set(0, 2.5, 2.02);
  group.add(plaque);
  // 匾额黑字（用细长方体模拟"藏经阁"三字）
  const textBar = box(1.5, 0.18, 0.05, 0x1a1a1a);
  textBar.position.set(0, 2.5, 2.08);
  group.add(textBar);

  // 底层两侧台阶
  const step1 = box(1.6, 0.25, 1.2, C.stoneLight);
  step1.position.set(-1.4, 0.125, 3.2);
  group.add(step1);
  const step2 = box(1.2, 0.25, 0.9, C.stone);
  step2.position.set(-1.4, 0.375, 3.5);
  group.add(step2);

  // 窗户（三层：8 亮一层、14 亮二层、17 亮三层）
  const winGeo = new THREE.BoxGeometry(0.42, 0.5, 0.08);
  const winMatOn = new THREE.MeshStandardMaterial({ color: C.window, emissive: C.windowEmissive, emissiveIntensity: 1.6 });
  const winMatOff = new THREE.MeshStandardMaterial({ color: 0x1a1208, roughness: 0.9 });
  const floorWinPos = [
    [ // 一层（8 扇）
      [1.6, 1.8, 2.02], [-1.6, 1.8, 2.02],
      [1.9, 1.8, 1.3], [1.9, 1.8, -1.3],
      [-1.9, 1.8, 1.3], [-1.9, 1.8, -1.3],
      [1.4, 1.1, 2.02], [-1.4, 1.1, 2.02]
    ],
    [ // 二层（6 扇）
      [1.4, 5, 1.52], [-1.4, 5, 1.52],
      [1.85, 5, 0.9], [1.85, 5, -0.9],
      [-1.85, 5, 0.9], [-1.85, 5, -0.9]
    ],
    [ // 三层（3 扇）
      [0, 7.75, 1.02],
      [1.2, 7.75, 0.7], [-1.2, 7.75, 0.7]
    ]
  ];
  const useWinLights = !IS_MOBILE;
  floorWinPos.forEach(posArr => {
    const tierRec = { meshes: [], lights: [] };
    posArr.forEach(pos => {
      const w = new THREE.Mesh(winGeo, winMatOff.clone());
      w.position.set(...pos);
      group.add(w);
      tierRec.meshes.push(w);
      if (useWinLights) {
        // 每扇窗一个暖黄点灯（更亮 + 发光面）
        const pl = new THREE.PointLight(0xffaa00, 0, 7);
        pl.position.set(pos[0], pos[1], pos[2] - 0.3);
        group.add(pl);
        tierRec.lights.push(pl);
      }
    });
    windowTiers.push(tierRec);
  });

  // 门口红灯笼 + 暖光点光源
  const lantern = glowSphere(0.22, 0xff5533, [0, 1.7, 2.35]);
  group.add(lantern);
  const lanternLight = new THREE.PointLight(0xff6a3b, 0.9, 7);
  lanternLight.position.set(0, 1.7, 2.35);
  group.add(lanternLight);
  group.userData.lantern = lantern;
  group.userData.lanternLight = lanternLight;
  group.userData.lanternSeed = Math.random() * 10;
  hangingLanterns.push({ mesh: lantern, light: lanternLight, seed: Math.random() * 10 });

  return { type: 'library', group, locked: false, baseY: 0, viewY: 6, label: '藏经阁' };
}

// ================= 百草园：篱笆药圃 =================
function createBaicaoyuan() {
  const group = new THREE.Group();
  group.position.set(-8, 0, 3);

  // 草地
  const lawn = box(5.2, 0.2, 4.2, C.grass);
  lawn.position.y = 0.1;
  group.add(lawn);
  // 泥土
  const soil = box(4.6, 0.06, 3.6, 0x5c4033);
  soil.position.y = 0.2;
  group.add(soil);

  // 围栏立柱
  const poleMat = new THREE.MeshStandardMaterial({ color: C.woodDark, roughness: 0.8 });
  const poles = [
    [-2.4, 1.9], [2.4, 1.9], [-2.4, -1.9], [2.4, -1.9],
    [-2.4, 0.5], [2.4, 0.5], [-0.8, 1.9], [0.8, 1.9]
  ];
  poles.forEach(([x, z]) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.1, 0.18), poleMat);
    p.position.set(x, 0.75, z);
    p.castShadow = true;
    group.add(p);
  });
  // 围栏横栏
  const railH = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.12, 0.12), poleMat);
  railH.position.set(0, 0.6, 2.0);
  group.add(railH);
  const railH2 = railH.clone();
  railH2.position.z = -2.0;
  group.add(railH2);
  const railV = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 4.2), poleMat);
  railV.position.set(2.5, 0.6, 0);
  group.add(railV);
  const railV2 = railV.clone();
  railV2.position.x = -2.5;
  group.add(railV2);

  // 药草（3 株，带摇摆动画）
  const herbPos = [[-1, 0.3], [0, 0.4], [1, 0.2]];
  for (let i = 0; i < 3; i++) {
    const plant = new THREE.Group();
    const stem = cyl(0.03, 0.035, 0.8, C.stem);
    stem.position.y = 0.4;
    plant.add(stem);
    for (let e = 0; e < 3; e++) {
      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshStandardMaterial({ color: C.leaf, roughness: 0.6 })
      );
      leaf.scale.y = 0.32;
      const a = (e / 3) * Math.PI * 2 + i;
      leaf.position.set(Math.cos(a) * 0.22, 0.75 + e * 0.1, Math.sin(a) * 0.22);
      plant.add(leaf);
    }
    plant.position.set(herbPos[i][0], 0.22, herbPos[i][1]);
    group.add(plant);
    herbs.push(plant);
    herbHeights.push(plant.position.y);
  }

  // 木牌
  const sign = box(1.1, 0.5, 0.1, C.woodDark);
  sign.position.set(0, 0.5, 1.3);
  group.add(sign);
  const signText = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.3),
    new THREE.MeshBasicMaterial({ color: 0xfff3c4 })
  );
  signText.position.set(0, 0.5, 1.36);
  group.add(signText);

  // 萤火虫（3 个，缓慢飘动 + 绿色点灯）
  for (let i = 0; i < 3; i++) {
        const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xa3e635, transparent: true, opacity: 0.9 })
    );
    glow.position.set(-1.5 + i * 1.5, 1.3, 0);
    group.add(glow);
    const pl = new THREE.PointLight(0xa3e635, 0.25, 4);
    pl.position.copy(glow.position);
    group.add(pl);
        fireflies.push({ mesh: glow, light: pl, seed: i * 1.7 });
  }

  // 围栏上的小花（辨识度）
  const flowerColors = [0xf472b6, 0xfbbf24, 0xef4444, 0xa78bfa, 0x4ade80];
  const flowerPos = [[-2.4, 1.9], [2.4, -1.9], [-2.4, 0.5], [2.4, 0.5], [0.8, 1.9]];
  flowerPos.forEach(([fx, fz], i) => {
    const fl = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 6, 6),
      new THREE.MeshStandardMaterial({
        color: flowerColors[i % 5],
        roughness: 0.4,
        emissive: flowerColors[i % 5],
        emissiveIntensity: 0.3
      })
    );
    fl.position.set(fx, 1.12, fz);
    group.add(fl);
    flowers.push(fl);
  });
  // 药草发出的极淡绿色微光
  const herbGlow = new THREE.PointLight(0x4ade80, 0.3, 4);
  herbGlow.position.set(0, 1.2, 0.3);
  group.add(herbGlow);

  return { type: 'garden', group, locked: false, baseY: 0, viewY: 3, label: '百草园' };
}

// ================= 演武场：古代木质比武擂台 =================
function createYanwuchang() {
  const group = new THREE.Group();
  group.position.set(8, 0, 3);

  const woodTex = TEX.wood;
  const woodDeep = 0x5c3a21;   // 深棕老木（台面）
  const woodPlank = 0x4a3728;  // 立柱 / 深木
  const woodRail = 0x6b4c35;   // 横栏

  // ---- 厚实木台面（带木纹，高度 0.8）----
  const platform = woodBox(5, 0.8, 5, woodTex, woodDeep, { roughness: 0.8 });
  platform.position.y = 0.4;
  group.add(platform);

  // ---- 侧面木板缝隙（垂直细线，正面中央留台阶口）----
  const seamMat = new THREE.MeshStandardMaterial({ color: 0x3d2616, roughness: 0.9 });
  const seam = (x, y, z, w, d) => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(w, 0.8, d), seamMat);
    s.position.set(x, y, z);
    s.castShadow = true;
    group.add(s);
  };
  // 前（+z）面：左右各 2 条，中央留台阶
  [[-1.7, 0.4, 2.52, 0.04, 0.06], [-0.95, 0.4, 2.52, 0.04, 0.06], [0.95, 0.4, 2.52, 0.04, 0.06], [1.7, 0.4, 2.52, 0.04, 0.06]].forEach(p => seam(...p));
  // 后（-z）面：5 条
  [[-1.8, 0.4, -2.52, 0.04, 0.06], [-0.9, 0.4, -2.52, 0.04, 0.06], [0, 0.4, -2.52, 0.04, 0.06], [0.9, 0.4, -2.52, 0.04, 0.06], [1.8, 0.4, -2.52, 0.04, 0.06]].forEach(p => seam(...p));
  // 左（-x）面、右（+x）面：各 4 条
  [[-2.52, 0.4, -1.6, 0.06, 0.04], [-2.52, 0.4, -0.75, 0.06, 0.04], [-2.52, 0.4, 0.75, 0.06, 0.04], [-2.52, 0.4, 1.6, 0.06, 0.04]].forEach(p => seam(...p));
  [[2.52, 0.4, -1.6, 0.06, 0.04], [2.52, 0.4, -0.75, 0.06, 0.04], [2.52, 0.4, 0.75, 0.06, 0.04], [2.52, 0.4, 1.6, 0.06, 0.04]].forEach(p => seam(...p));

  // ---- 正面三级台阶（+z 侧，逐级内收）----
  const st1 = box(1.5, 0.26, 0.6, 0x6b4c35);
  st1.position.set(0, 0.13, 3.15); group.add(st1);
  const st2 = box(1.2, 0.26, 0.5, 0x7a5c45);
  st2.position.set(0, 0.39, 2.95); group.add(st2);
  const st3 = box(0.9, 0.26, 0.4, 0x8b6d55);
  st3.position.set(0, 0.65, 2.68); group.add(st3);

  // ---- 四面木质围栏（四角立柱 + 上下横栏 + 竖向格栅）----
  const postMat = new THREE.MeshStandardMaterial({ color: woodPlank, roughness: 0.85 });
  const railMat = new THREE.MeshStandardMaterial({ color: woodRail, roughness: 0.8 });
  const corners = [[-2.42, -2.42], [2.42, -2.42], [-2.42, 2.42], [2.42, 2.42]];
  corners.forEach(([x, z]) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 0.15), postMat);
    p.position.set(x, 1.4, z);
    p.castShadow = true;
    group.add(p);
  });
  const rail = (cx, cz, len, axis, y) => {
    const r = new THREE.Mesh(
      axis === 'x' ? new THREE.BoxGeometry(len, 0.08, 0.08) : new THREE.BoxGeometry(0.08, 0.08, len),
      railMat
    );
    r.position.set(cx, y, cz);
    r.castShadow = true;
    group.add(r);
  };
  // 后侧（-z）、右侧（+x）、左侧（-x）整根横栏
  rail(0, -2.42, 4.84, 'x', 1.8); rail(0, -2.42, 4.84, 'x', 1.4);
  rail(2.42, 0, 4.84, 'z', 1.8); rail(2.42, 0, 4.84, 'z', 1.4);
  rail(-2.42, 0, 4.84, 'z', 1.8); rail(-2.42, 0, 4.84, 'z', 1.4);
  // 前侧（+z）两段，中央留台阶口
  rail(-1.585, 2.42, 1.67, 'x', 1.8); rail(-1.585, 2.42, 1.67, 'x', 1.4);
  rail(1.585, 2.42, 1.67, 'x', 1.8); rail(1.585, 2.42, 1.67, 'x', 1.4);

  // 竖向格栅（上下横栏之间）
  const slatMat = new THREE.MeshStandardMaterial({ color: woodRail, roughness: 0.8 });
  const slat = (x, z) => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.05), slatMat);
    s.position.set(x, 1.6, z);
    s.castShadow = true;
    group.add(s);
  };
  [[-1.2, -2.42], [0, -2.42], [1.2, -2.42]].forEach(([x, z]) => slat(x, z));
  [[2.42, -1.2], [2.42, 0], [2.42, 1.2]].forEach(([x, z]) => slat(x, z));
  [[-2.42, -1.2], [-2.42, 0], [-2.42, 1.2]].forEach(([x, z]) => slat(x, z));
  [[-1.9, 2.42], [1.9, 2.42]].forEach(([x, z]) => slat(x, z));

  // ---- 四角旗帜（深红「武」旗，解锁飘动 / 封印低垂）----
  const flagTex = makeFlagTexture();
  const flagGeo = new THREE.PlaneGeometry(0.6, 0.9);
  flagGeo.translate(0.3, 0, 0);   // 枢轴在旗杆侧
  const flags = [];
  corners.forEach(([x, z]) => {
    const pole = cyl(0.03, 0.03, 1.5, woodPlank);
    pole.position.set(x, 2.75, z);
    group.add(pole);
    const holder = new THREE.Group();
    holder.position.set(x, 2.95, z);
    holder.rotation.y = Math.atan2(z, x);   // 旗面向擂台外侧
    const flag = new THREE.Mesh(
      flagGeo,
      new THREE.MeshStandardMaterial({ color: 0x7f1d1d, side: THREE.DoubleSide, roughness: 0.7, map: flagTex })
    );
    holder.add(flag);
    group.add(holder);
    flags.push(flag);
  });
  group.userData.flags = flags;

  // ---- 后方兵器架（山字形木架 + 银剑）----
  const rack = new THREE.Group();
  const legA = cyl(0.045, 0.045, 1.3, woodPlank);
  legA.position.set(-0.25, 0.65, 0); legA.rotation.z = 0.3;
  rack.add(legA);
  const legB = cyl(0.045, 0.045, 1.3, woodPlank);
  legB.position.set(0.25, 0.65, 0); legB.rotation.z = -0.3;
  rack.add(legB);
  const bar = box(0.9, 0.07, 0.07, woodRail);
  bar.position.set(0, 1.0, 0);
  rack.add(bar);
  for (let i = 0; i < 3; i++) {
    const wpn = new THREE.Group();
    const blade = box(0.055, 0.85, 0.025, 0xc8cdd4);
    blade.position.y = 0.62;
    wpn.add(blade);
    const guard = box(0.14, 0.04, 0.025, 0xf2b13c);
    guard.position.y = 0.28;
    wpn.add(guard);
    const handle = box(0.055, 0.28, 0.025, woodPlank);
    handle.position.y = 0.12;
    wpn.add(handle);
    wpn.position.set((i - 1) * 0.28, 0, 0);
    wpn.rotation.z = (i - 1) * 0.14;
    rack.add(wpn);
  }
  rack.position.set(2.0, 0, -3.0);   // 擂台后方角落
  group.add(rack);

  // ---- 未解锁封印（初始显示，由 setProgress 控制）----
  const fogBox = new THREE.Mesh(
    new THREE.BoxGeometry(6, 2.6, 6),
    new THREE.MeshBasicMaterial({ color: 0x05080f, transparent: true, opacity: 0.5, depthWrite: false })
  );
  fogBox.position.y = 1.7;
  group.add(fogBox);
  const seal = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 1.4, 0.15),
    new THREE.MeshBasicMaterial({ color: 0xee4444 })
  );
  seal.position.y = 1.7;
  group.add(seal);
  group.userData.fogBox = fogBox;
  group.userData.seal = seal;

  return { type: 'arena', group, locked: true, baseY: 0, viewY: 3, label: '演武场' };
}

// ================= 问道崖：悬崖 + 云雾 =================
function createWendaoya() {
  const group = new THREE.Group();
  group.position.set(0, -2, 10);

  // 悬崖主体（多个长方体堆叠）
  const rockMat = new THREE.MeshStandardMaterial({ color: C.rock, roughness: 0.95 });
  const rockDark = new THREE.MeshStandardMaterial({ color: C.rockDark, roughness: 0.95 });
  const pieces = [
    { w: 4.2, h: 5.2, d: 2.4, x: 0, y: 2.6, z: 0, m: rockMat },
    { w: 2.4, h: 4.2, d: 3, x: 1.6, y: 2.1, z: 1.2, m: rockDark },
    { w: 2.0, h: 3.2, d: 2.2, x: -1.8, y: 1.6, z: 1.0, m: rockDark },
    { w: 2.2, h: 2.0, d: 2.0, x: 0.4, y: 1.0, z: -1.2, m: rockMat }
  ];
  pieces.forEach(p => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h, p.d), p.m);
    m.position.set(p.x, p.y, p.z);
    m.castShadow = true;
    group.add(m);
  });

  // 顶部平台
  const platform = box(3.2, 0.35, 2.2, C.cliffTop);
  platform.position.set(0, 5.7, 0);
  group.add(platform);
  // 石碑
  const stele = box(0.8, 1.6, 0.32, 0x5a5a5a);
  stele.position.set(0, 6.6, 0);
  group.add(stele);
    const steleText = new THREE.Mesh(
    new THREE.PlaneGeometry(0.6, 1.2),
    new THREE.MeshBasicMaterial({ color: 0xb9a6f0 })
  );
  steleText.position.set(0, 6.6, 0.18);
  group.add(steleText);

  // 石碑上方悬浮紫色光球（天道显化，自发光不照亮）
  const orb = glowSphere(0.32, 0xa78bfa, [0, 7.6, 0]);
  group.add(orb);
  group.userData.orb = orb;
  group.userData.orbSeed = Math.random() * 10;

  // 云雾（多个半透明球）
  const cloudCount = IS_MOBILE ? 6 : 10;
  for (let i = 0; i < cloudCount; i++) {
    const c = new THREE.Mesh(
      new THREE.SphereGeometry(1.4 + Math.random() * 1.6, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.14, depthWrite: false })
    );
    c.position.set((Math.random() - 0.5) * 8, 1.5 + Math.random() * 5, (Math.random() - 0.5) * 5);
    group.add(c);
    clouds.push(c);
    cloudSeeds.push({ x: c.position.x, y: c.position.y, spd: 0.3 + Math.random() * 0.4, ph: Math.random() * Math.PI * 2 });
  }

  return { type: 'cliff', group, locked: true, baseY: -2, viewY: 3.5, label: '问道崖' };
}

// ================= 交互 =================
function pickBuilding() {
  const rect = renderer.domElement.getBoundingClientRect();
  raycaster.setFromCamera(pointer, camera);
  // 检测所有建筑子 mesh
  const meshes = [];
  buildings.forEach(b => b.group.traverse(o => { if (o.isMesh) meshes.push(o); }));
  const hits = raycaster.intersectObjects(meshes, false);
  if (hits.length === 0) return null;
  let obj = hits[0].object;
  while (obj && !obj.userData._sect) {
    obj = obj.parent;
  }
  return obj ? obj.userData._sect : null;
}

function onPointerMove(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  const b = pickBuilding();
  if (b !== hovered) {
    if (hovered) resetHover(hovered);
    hovered = b;
    if (hovered) applyHover(hovered);
  }
}

function applyHover(b) {
  b.group.userData._origY = b.group.position.y;
  b.group.scale.setScalar(1.05);
  b.group.position.y = b.baseY + 0.3;
  // 金色光晕环升起
  if (b.hoverRing) {
    b.hoverRing.visible = true;
  }
  // 显示标签
  if (tagEl) {
    tagEl.textContent = b.label;
    tagEl.style.display = 'block';
  }
}

function resetHover(b) {
  b.group.scale.setScalar(1);
  b.group.position.y = b.baseY;
  if (b.hoverRing) {
    b.hoverRing.visible = false;
  }
  if (tagEl) tagEl.style.display = 'none';
}

// 清理悬停状态：离开主界面时调用，避免名称标签/建筑高亮残留到其他页面
function clearHover() {
  if (hovered) resetHover(hovered);
  hovered = null;
  if (tagEl) tagEl.style.display = 'none';
}

function onPointerDown() {
  const b = pickBuilding();
  if (!b) return;
  // 有效点击建筑：播放点击音效（由 app.js 提供）
  if (typeof playClickSfx === 'function') playClickSfx();
  // 平滑飞行到建筑正面，稍作停留后触发页面切换
  flightTo(b, () => {
    if (typeof window.onSectClick === 'function') {
      window.onSectClick(b.type);
    }
  });
}

// 平滑飞行（手动插值）：相机自然飞向建筑正面（略抬高、正视入口），到位后淡出切换到下一界面
function flightTo(b, done) {
  const viewY = b.viewY || 3;
  const target = new THREE.Vector3(b.baseX, b.baseY + viewY, b.baseZ + 7);
  const from = camera.position.clone();
  // 加速绕转取消，集中一个方向
  controls.autoRotate = false;
  const start = clock.getElapsedTime();
  const dur = 0.9;   // 单位：秒（0.9 秒完成飞行，与 clock.getElapsedTime() 一致）
  const startTarget = controls.target.clone();
  const endTarget = new THREE.Vector3(b.baseX, b.baseY + 1.2, b.baseZ);
  flightAnim = {
    camFrom: from,
    camTo: target,
    tgtFrom: startTarget,
    tgtTo: endTarget,
    start,
    dur,
    done: () => {
      if (typeof done !== 'function') return;
      const ov = document.getElementById('sectTransition');
      if (ov) {
        ov.classList.add('show');
        setTimeout(() => {
          done();
          setTimeout(() => ov.classList.remove('show'), 80);
        }, 300);
      } else {
        done();
      }
    }
  };
}

function updateTagPosition() {
  if (!hovered || !tagEl) return;
  const p = new THREE.Vector3();
  hovered.group.getWorldPosition(p);
  p.y += 4;
  p.project(camera);
  const x = (p.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-p.y * 0.5 + 0.5) * window.innerHeight;
  tagEl.style.left = x + 'px';
  tagEl.style.top = y + 'px';
}

function onResize() {
  // 容错：3D 未初始化（如 Three.js CDN 未加载）时直接忽略
  if (!camera || !renderer) return;
  const container = document.getElementById('sect3d-container');
  if (!container) return;
  const w = container.clientWidth || window.innerWidth;
  const h = container.clientHeight || window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

// ================= 动画 =================
function animate() {
  requestAnimationFrame(animate);
  // 仅主界面激活时渲染，节省资源
  const pageMain = document.getElementById('pageMain');
  if (!pageMain || !pageMain.classList.contains('active')) return;
  try {
    const t = clock.getElapsedTime();

    // ---- 进场 / 点击飞行相机动画 ----
    if (flightAnim) {
      const p = Math.min(1, (t - flightAnim.start) / flightAnim.dur);
      const e = easeInOut(p);
      camera.position.lerpVectors(flightAnim.camFrom, flightAnim.camTo, e);
      if (flightAnim.tgtFrom && flightAnim.tgtTo) {
        controls.target.lerpVectors(flightAnim.tgtFrom, flightAnim.tgtTo, e);
      }
      if (p >= 1) {
        const done = flightAnim.done;
        flightAnim = null;
        if (done) done();
      }
    }

    // 药草摇摆
    herbs.forEach((h, i) => {
      h.rotation.z = Math.sin(t * 1.2 + i * 1.3) * 0.06;
      h.rotation.x = Math.cos(t * 1.0 + i) * 0.04;
    });
    // 旗帜飘动 + 悬停环 + 锁定建筑抖动 + 灯笼/火把
    buildings.forEach(b => {
      // 比武旗：解锁时随风飘动，封印时低垂
      if (b.group.userData.flags) {
        b.group.userData.flags.forEach((f, i) => {
          if (b.locked) {
            f.rotation.set(0, 0, -Math.PI / 2 + 0.14 * Math.sin(t * 1.5 + i));
          } else {
            f.rotation.set(Math.cos(t * 2.0 + i) * 0.04, Math.sin(t * 2.4 + i * 0.9) * 0.15, 0);
          }
        });
      }
      // 火把火焰闪烁
      if (b.group.userData.torches) {
        b.group.userData.torches.forEach(tc => {
          const f = 0.8 + Math.sin(t * 6 + tc.seed) * 0.2 + Math.sin(t * 13 + tc.seed) * 0.06;
          tc.flameLight.intensity = 0.45 * f;
          tc.flame.scale.setScalar(0.85 + Math.sin(t * 11 + tc.seed) * 0.2);
        });
      }
      // 灯笼闪烁
      if (b.group.userData.lantern) {
        const f = 0.85 + Math.sin(t * 5 + b.group.userData.lanternSeed) * 0.15;
        b.group.userData.lanternLight.intensity = 0.85 * f;
        b.group.userData.lantern.scale.setScalar(0.9 + Math.sin(t * 7) * 0.1);
      }
      // 问道崖紫色光球脉动
      if (b.group.userData.orb) {
        b.group.userData.orb.scale.setScalar(1 + Math.sin(t * 2.2 + b.group.userData.orbSeed) * 0.18);
      }
      // 悬停光晕环（脉冲上升）
      if (b.hoverRing && b.hoverRing.visible) {
        const rise = (Math.sin(t * 3) + 1) / 2;
        b.hoverRing.material.opacity = 0.35 + rise * 0.3;
        b.hoverRing.scale.setScalar(1 + rise * 0.15);
      }
      // 锁定建筑轻微抖动（封印挣扎）
      if (b.locked) {
        b.group.position.x = b.baseX + Math.sin(t * 6) * 0.04;
      }
    });
    // 云雾漂移（加旋转 + 轻微缩放变形）
    clouds.forEach((c, i) => {
      const s = cloudSeeds[i];
      c.position.y = s.y + Math.sin(t * s.spd + s.ph) * 0.5;
      c.position.x = s.x + Math.cos(t * s.spd * 0.8 + s.ph) * 0.6;
      c.rotation.y += 0.003;
      c.rotation.x += 0.001;
      c.scale.setScalar(1 + Math.sin(t * 0.6 + s.ph) * 0.1);
    });
    // 萤火虫飘动（忽明忽暗）
    fireflies.forEach((f, i) => {
      f.mesh.position.y = 1.1 + Math.sin(t * 1.5 + f.seed) * 0.5;
      f.mesh.position.x = -1.5 + i * 1.5 + Math.cos(t * 0.7 + f.seed) * 0.6;
      f.mesh.position.z = Math.sin(t * 0.5 + f.seed) * 0.5;
      f.light.position.copy(f.mesh.position);
      const a = 0.6 + (Math.sin(t * 4 + f.seed) + 1) * 0.2;
      f.mesh.material.opacity = a;
      f.light.intensity = 0.3 * a;
    });
    // 星空缓慢旋转
    if (stars) stars.rotation.y += 0.0004;
    // 落叶飘落
    fallingLeaves.forEach(lf => {
      lf.mesh.position.x += Math.sin(t * 0.8 + lf.seed) * 0.01 + lf.vx * 0.008;
      lf.mesh.position.y += lf.vy * 0.016;
      lf.mesh.rotation.z += 0.03;
      if (lf.mesh.position.y < -0.4) {
        lf.mesh.position.set(
          (Math.random() * 2 - 1) * 26,
          12 + Math.random() * 8,
          (Math.random() * 2 - 1) * 22
        );
      }
    });
    // 花朵轻轻摇摆
    flowers.forEach((fl, i) => {
      fl.rotation.y += 0.02;
      fl.position.y = 1.12 + Math.sin(t * 1.5 + i) * 0.02;
    });

        updateTagPosition();
    if (!flightAnim) controls.update();
    renderer.render(scene, camera);
    window.__sectFrames = (window.__sectFrames || 0) + 1;
  } catch (e) {
    window.__sectErr = String(e && e.stack || e);
  }
}

function easeInOut(a) {
  return a < 0.5 ? 2 * a * a : 1 - Math.pow(-2 * a + 2, 2) / 2;
}

// ================= 对外接口 =================
function setProgress(collected, total, levelProg) {
  libraryProgress = collected;
  libraryTotal = total || 17;
  levelProgress = levelProg || 0;

  // 藏经阁三层窗灯：8 亮一层、14 亮二层、17 亮三层（每层内部随收集数渐进，17 张卡片 = 17 扇窗）
  const tierCaps = [8, 6, 3];
  let remaining = collected;
  windowTiers.forEach((tier, i) => {
    const litCount = Math.max(0, Math.min(remaining, tierCaps[i]));
    remaining -= litCount;
    tier.meshes.forEach((m, j) => {
      const on = j < litCount;
      m.material.color.set(on ? C.window : 0x1a1208);
      m.material.emissive.set(on ? C.windowEmissive : 0x000000);
      m.material.emissiveIntensity = on ? 2.2 : 0;
    });
    tier.lights.forEach((pl, j) => { pl.intensity = j < litCount ? 1.0 : 0; });
  });

  // 演武场解锁
  const arena = buildings.find(b => b.type === 'arena');
  const arenaUnlocked = (total > 0 && collected === total);
  if (arena) {
    arena.locked = !arenaUnlocked;
    if (arena.group.userData.fogBox) {
      arena.group.userData.fogBox.visible = !arenaUnlocked;
      arena.group.userData.seal.visible = !arenaUnlocked;
    }
  }
  // 问道崖解锁（武林盟主 = levelProgress >= 3）
  const cliff = buildings.find(b => b.type === 'cliff');
  if (cliff) {
    cliff.locked = levelProgress < 3;
    // 解锁后云雾散去
    const target = levelProgress >= 3 ? 0.05 : 0.14;
    clouds.forEach(c => {
      c.material.opacity = target;
    });
  }
}

function start() {
  init();
}

// 暴露给普通脚本（经典脚本，不参与 ESM 模块图：Three.js CDN 加载失败时不影响其余游戏逻辑）
const SECT3D = {
  start,
  setProgress,
  resize: onResize,
  // 从子页面返回主界面时恢复沙盘自动巡航旋转（flightTo 会临时关闭 autoRotate）
  resumeAutoRotate: () => { if (controls) controls.autoRotate = true; },
  // 离开主界面时清理悬停标签/建筑高亮，避免残留到其他页面
  clearHover
};
window.SECT3D = SECT3D;
// 调试接口：暴露内部对象（检查渲染状态用）
window.__sect3d = {
  getScene: () => scene,
  getCamera: () => camera,
  getRenderer: () => renderer,
  getBuildings: () => buildings,
  renderOnce: () => { if (renderer && scene && camera) { renderer.render(scene, camera); return true; } return false; },
  analyze: () => {
    const out = { buildings: [], totalMeshes: 0, totalTris: 0, visibleTris: 0 };
    buildings.forEach(b => {
      let meshes = 0, tris = 0, visTris = 0;
      b.group.traverse(o => {
        if (o.isMesh) {
          meshes++;
          const n = o.geometry.attributes.position ? o.geometry.attributes.position.count / 3 : 0;
          tris += n;
          if (o.visible && o.material && o.material.visible !== false) visTris += n;
        }
      });
      out.buildings.push({ type: b.type, label: b.label, meshes, tris, visTris, worldPos: b.group.position.toArray() });
      out.totalMeshes += meshes;
      out.totalTris += tris;
      out.visibleTris += visTris;
    });
    if (scene) {
      out.sceneChildren = scene.children.length;
      out.fog = scene.fog ? [scene.fog.near, scene.fog.far] : null;
    }
    if (camera) {
      out.cameraPos = camera.position.toArray();
      out.cameraFov = camera.fov;
    }
    return out;
  }
};

// 页面加载即初始化沙盘（canvas 常驻，主界面显示后再 resize）
// 容错：Three.js 未加载（CDN 被墙/超时）时静默降级，不影响其余游戏逻辑
if (typeof THREE !== 'undefined') {
  try {
    start();
  } catch (e) {
    console.warn('3D 沙盘初始化失败（可能是 Three.js CDN 未加载）：', e);
  }
}
