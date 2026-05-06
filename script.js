// ═══════════════════════════════════════════════════════════
//  ask-out · Three.js
//  WASD movement · walk boundaries · picnic · readable letters
// ═══════════════════════════════════════════════════════════

const scene    = new THREE.Scene();
const camera   = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.setClearColor(0x0a0010);
document.body.appendChild(renderer.domElement);
window.threeCanvas = renderer.domElement;   // used by index.html start button

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ═══════════════════════════════════════════════════════════
//  SPEED & BOUNDARY CONTROLS  ← easy to tune
// ═══════════════════════════════════════════════════════════
const MOUSE_SENSITIVITY = 0.0018;   // camera turn speed — lower = slower
const WALK_SPEED        = 0.07;     // units per frame — lower = slower walk

const BOUNDARY = {                  // player cannot walk outside these limits
    minX: -9, maxX: 9,
    minZ: -10, maxZ:  8,
};

// ═══════════════════════════════════════════════════════════
//  FIRST-PERSON CAMERA
// ═══════════════════════════════════════════════════════════
const PLAYER_HEIGHT = 1.6;
camera.position.set(0, PLAYER_HEIGHT, 6);

// ── Starting look direction ─────────────────────────────────
// yaw = horizontal angle. Math.PI = face toward -Z (toward picnic)
//                          0      = face toward +Z (away from picnic)
const look = { yaw: Math.PI, pitch: 0, locked: false };

// Use camera.rotation with 'YXZ' order — the correct FPS order.
// Three.js reads camera.rotation directly each frame; setting it
// here means NO quaternion conflicts and NO snapping ever.
camera.rotation.order = 'YXZ';
camera.rotation.y = look.yaw;
camera.rotation.x = look.pitch;

// Pointer lock
renderer.domElement.addEventListener('click', () => {
    if (!inspectMode && !document.pointerLockElement)
        renderer.domElement.requestPointerLock();
});
document.addEventListener('pointerlockchange', () => {
    look.locked = document.pointerLockElement === renderer.domElement;
});

// mousemove: just add delta straight to camera.rotation — no intermediate step
document.addEventListener('mousemove', e => {
    if (!look.locked || inspectMode) return;
    camera.rotation.y -= e.movementX * MOUSE_SENSITIVITY;  // ← horizontal
    camera.rotation.x -= e.movementY * MOUSE_SENSITIVITY;  // ← vertical
    // Clamp pitch so player can't flip upside down
    camera.rotation.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, camera.rotation.x));
    // Keep look in sync for movePlayer()
    look.yaw   = camera.rotation.y;
    look.pitch = camera.rotation.x;
});

// Touch look (mobile fallback)
const touch = { lx: 0, ly: 0, on: false };
renderer.domElement.addEventListener('touchstart', e => {
    touch.on = true; touch.lx = e.touches[0].clientX; touch.ly = e.touches[0].clientY;
}, { passive: true });
window.addEventListener('touchmove', e => {
    if (!touch.on || inspectMode) return;
    camera.rotation.y -= (e.touches[0].clientX - touch.lx) * MOUSE_SENSITIVITY * 2;
    camera.rotation.x -= (e.touches[0].clientY - touch.ly) * MOUSE_SENSITIVITY * 2;
    camera.rotation.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, camera.rotation.x));
    look.yaw   = camera.rotation.y;
    look.pitch = camera.rotation.x;
    touch.lx = e.touches[0].clientX; touch.ly = e.touches[0].clientY;
}, { passive: true });
window.addEventListener('touchend', () => { touch.on = false; });

// ═══════════════════════════════════════════════════════════
//  WASD MOVEMENT  (no jumping — Y is always PLAYER_HEIGHT)
// ═══════════════════════════════════════════════════════════
const keys = {};
window.addEventListener('keydown', e => { keys[e.code] = true; });
window.addEventListener('keyup',   e => { keys[e.code] = false; });

function movePlayer() {
    if (inspectMode) return;

    // Horizontal forward/right vectors — pitch is ignored so player never flies
    const fwd   = new THREE.Vector3( Math.sin(look.yaw), 0,  Math.cos(look.yaw));
    const right = new THREE.Vector3( Math.cos(look.yaw), 0, -Math.sin(look.yaw));
    const move  = new THREE.Vector3();

    if (keys['KeyW'] || keys['ArrowUp'])    move.addScaledVector(fwd,   -1);
    if (keys['KeyS'] || keys['ArrowDown'])  move.addScaledVector(fwd,    1);
    if (keys['KeyA'] || keys['ArrowLeft'])  move.addScaledVector(right, -1);
    if (keys['KeyD'] || keys['ArrowRight']) move.addScaledVector(right,  1);

    if (move.lengthSq() === 0) return;
    move.normalize().multiplyScalar(WALK_SPEED);    // ← WALK_SPEED

    // Apply + clamp to boundary
    camera.position.x = Math.max(BOUNDARY.minX, Math.min(BOUNDARY.maxX, camera.position.x + move.x));
    camera.position.z = Math.max(BOUNDARY.minZ, Math.min(BOUNDARY.maxZ, camera.position.z + move.z));
    camera.position.y = PLAYER_HEIGHT;
}

// ═══════════════════════════════════════════════════════════
//  LIGHTS
// ═══════════════════════════════════════════════════════════
scene.add(new THREE.AmbientLight(0xffeedd, 0.55));

const sun = new THREE.DirectionalLight(0xfff4d0, 1.2);
sun.position.set(10, 20, 5);
sun.castShadow = true;
scene.add(sun);

const pinkLight   = new THREE.PointLight(0xff69b4, 4, 40);
const purpleLight = new THREE.PointLight(0xaa44ff, 3, 40);
pinkLight.position.set(4, 6, 4);
purpleLight.position.set(-4, 4, -4);
scene.add(pinkLight, purpleLight);

// ═══════════════════════════════════════════════════════════
//  STARFIELD
// ═══════════════════════════════════════════════════════════
const starPos = new Float32Array(2000 * 3);
for (let i = 0; i < starPos.length; i++) starPos[i] = (Math.random() - 0.5) * 300;
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
scene.add(new THREE.Points(starGeo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.14, transparent: true, opacity: 0.75 })
));

// ═══════════════════════════════════════════════════════════
//  GRASS GROUND
// ═══════════════════════════════════════════════════════════
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshPhongMaterial({ color: 0x2a5414, shininess: 4 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ═══════════════════════════════════════════════════════════
//  PICNIC BLANKET  (red-white checker)
// ═══════════════════════════════════════════════════════════
function makeChecker() {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const ctx = c.getContext('2d');
    const sq = 64;
    for (let r = 0; r < 8; r++)
        for (let col = 0; col < 8; col++) {
            ctx.fillStyle = (r + col) % 2 === 0 ? '#cc2020' : '#f5f0e8';
            ctx.fillRect(col * sq, r * sq, sq, sq);
        }
    return new THREE.CanvasTexture(c);
}

const blanket = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 5),
    new THREE.MeshPhongMaterial({ map: makeChecker(), shininess: 4 })
);
blanket.rotation.x = -Math.PI / 2;
blanket.position.set(0, 0.01, -4);
blanket.receiveShadow = true;
scene.add(blanket);

// Border trim
const trimMat = new THREE.MeshPhongMaterial({ color: 0x8b1010 });
[{ s: [6.2, 0.04, 0.14], p: [0, 0.025,  -1.43] },
 { s: [6.2, 0.04, 0.14], p: [0, 0.025,  -6.57] },
 { s: [0.14, 0.04, 5.2], p: [-3.07, 0.025, -4] },
 { s: [0.14, 0.04, 5.2], p: [ 3.07, 0.025, -4] }].forEach(({ s, p }) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...s), trimMat);
    m.position.set(...p); scene.add(m);
});

// ─── Picnic basket ───────────────────────────────────────────
const basketMat = new THREE.MeshPhongMaterial({ color: 0xb8860b, shininess: 20 });
const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.4, 0.7, 12), basketMat);
basket.position.set(2.3, 0.35, -5.6); basket.castShadow = true; scene.add(basket);
const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.1, 12), basketMat);
lid.position.set(2.3, 0.76, -5.6); scene.add(lid);
const handle = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.045, 8, 16, Math.PI), basketMat);
handle.position.set(2.3, 0.98, -5.6); scene.add(handle);

// ─── Plate + cup ─────────────────────────────────────────────
const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.46, 0.05, 24),
    new THREE.MeshPhongMaterial({ color: 0xf8f8f8, shininess: 80 })
);
plate.position.set(-1.6, 0.025, -3.4); scene.add(plate);

const cup = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.12, 0.42, 12),
    new THREE.MeshPhongMaterial({ color: 0xff4444, shininess: 60 })
);
cup.position.set(-0.5, 0.21, -5.3); scene.add(cup);

// ─── Flowers around the blanket ──────────────────────────────
function addFlower(x, z) {
    const stemMat = new THREE.MeshPhongMaterial({ color: 0x228b22 });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.28, 6), stemMat);
    stem.position.set(x, 0.14, z); scene.add(stem);
    const petal = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 8, 8),
        new THREE.MeshPhongMaterial({ color: new THREE.Color().setHSL(Math.random(), 1, 0.65) })
    );
    petal.position.set(x, 0.33, z); scene.add(petal);
}
[[-4.5,-2],[4.5,-2],[-4.5,-6],[4.5,-6],[0,-7.5],
 [-2.5,-7.8],[2.5,-7.8],[-5.5,-4],[5.5,-4],
 [-3,-1],[3,-1],[-1.5,-8],[1.5,-8]].forEach(([x,z]) => addFlower(x,z));

// ═══════════════════════════════════════════════════════════
//  FLOATING SIGNS
// ═══════════════════════════════════════════════════════════
function makeTextTex(text, color = '#ffffff', size = 52, w = 1024, h = 256) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    ctx.font = `bold ${size}px Georgia,serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = color; ctx.shadowBlur = 22;
    ctx.fillText(text, w / 2, h / 2);
    return new THREE.CanvasTexture(c);
}

const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.8),
    new THREE.MeshBasicMaterial({ map: makeTextTex('Will you go out with me? 💕','#ff9ec4'), transparent:true, side:THREE.DoubleSide }));
sign.position.set(0, 3.5, -11); scene.add(sign);

const signBack = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.8),
    new THREE.MeshBasicMaterial({ map: makeTextTex('Please say YES! 🌸','#ffdf80',56), transparent:true, side:THREE.DoubleSide }));
signBack.position.set(0, 3.5, 9.5); signBack.rotation.y = Math.PI; scene.add(signBack);

// ═══════════════════════════════════════════════════════════
//  LETTER CONTENTS  — what each letter says
// ═══════════════════════════════════════════════════════════
const CONTENTS = [
    ['To my favorite person,', '', 'Every moment with you feels', 'like sunshine. ☀️', '', 'You make everything brighter.', 'Always. 💛'],
    ['Hey you,', '', 'I\'ve been meaning to ask...', 'Will you go out with me? 🌸', '', 'Pretty please?', '  — Your secret admirer'],
    ['P.S.  Just say yes. 😊', '', 'I promise picnics,', 'sunsets, and fireworks 🎆', '', '...and lots of letters', 'just like this one. 💌'],
];

// ═══════════════════════════════════════════════════════════
//  LETTER PAPER TEXTURE  (looks like a real handwritten note)
// ═══════════════════════════════════════════════════════════
function makeLetterTex(lines) {
    const W = 800, H = 600;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');

    // Paper
    ctx.fillStyle = '#fffdf0';
    ctx.fillRect(0, 0, W, H);

    // Ruled lines
    ctx.strokeStyle = '#e0d8c0'; ctx.lineWidth = 1;
    for (let y = 68; y < H - 10; y += 44) {
        ctx.beginPath(); ctx.moveTo(50, y); ctx.lineTo(W - 50, y); ctx.stroke();
    }

    // Red margin
    ctx.strokeStyle = '#ffb0b0'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(88, 20); ctx.lineTo(88, H - 20); ctx.stroke();

    // Handwriting
    ctx.fillStyle = '#2a1a0a';
    ctx.shadowBlur = 0;
    lines.forEach((line, i) => {
        if (line === '') return;
        // Alternate slightly between sizes for natural feel
        ctx.font = `italic ${i === 0 ? 30 : 28}px Georgia,serif`;
        ctx.fillText(line, 100, 52 + i * 44);
    });

    return new THREE.CanvasTexture(c);
}

// ═══════════════════════════════════════════════════════════
//  ENVELOPE / LETTER OBJECTS
// ═══════════════════════════════════════════════════════════
const ENV_COLORS  = [0xffddaa, 0xffd6e0, 0xd6e8ff];
const SEAL_COLORS = ['#c8842a', '#cc6688', '#6688cc'];
const YES         = ['Y', 'E', 'S'];

// Where each envelope rests on the blanket (world-space, never changes)
const REST_POS = [
    new THREE.Vector3(-1.8, 0.04, -4.3),
    new THREE.Vector3( 0,   0.04, -4.3),
    new THREE.Vector3( 1.8, 0.04, -4.3),
];
const REST_ROT = [
    new THREE.Euler(-Math.PI/2, 0, -0.15),
    new THREE.Euler(-Math.PI/2, 0,  0.04),
    new THREE.Euler(-Math.PI/2, 0,  0.18),
];

const envMeshes   = [];   // clickable envelope bodies
const noteMeshes  = [];   // letter-paper planes (hidden until inspect)
const sealMeshes  = [];   // wax seal circles

for (let i = 0; i < 3; i++) {
    // ── Envelope body ─────────────────────────────────────
    const env = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.04, 0.8),
        new THREE.MeshPhongMaterial({ color: ENV_COLORS[i], shininess: 40 })
    );
    env.position.copy(REST_POS[i]);
    env.rotation.copy(REST_ROT[i]);
    env.castShadow = true;
    scene.add(env);
    envMeshes.push(env);

    // ── Wax seal (circle with letter) ─────────────────────
    const seal = new THREE.Mesh(
        new THREE.CircleGeometry(0.17, 16),
        new THREE.MeshBasicMaterial({
            map: makeTextTex(YES[i], SEAL_COLORS[i], 72, 128, 128),
            transparent: true,
        })
    );
    seal.position.copy(REST_POS[i]);
    seal.position.y += 0.026;
    seal.rotation.copy(REST_ROT[i]);
    scene.add(seal);
    sealMeshes.push(seal);

    // ── Note (letter paper) — hidden until inspect ─────────
    // PlaneGeometry size = how big the note looks in front of the player
    // Increase (2.6, 1.95) to make it larger
    const note = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 1.95),
        new THREE.MeshBasicMaterial({
            map: makeLetterTex(CONTENTS[i]),
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
        })
    );
    note.visible = false;
    scene.add(note);
    noteMeshes.push(note);
}

// ═══════════════════════════════════════════════════════════
//  INSPECT MODE
//  Click envelope → note floats in front of player (top-down readable)
//  ESC            → note hides, envelope snaps back to exact original state
// ═══════════════════════════════════════════════════════════
let inspectMode  = false;
let inspectedIdx = -1;

// Exact saved state — restored on ESC
const savedEnvPos = new THREE.Vector3();
const savedEnvRot = new THREE.Euler();

// Target: note hovers ~1.4 m ahead, tilted so you read it like holding paper
function getNoteTarget() {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    return camera.position.clone()
        .addScaledVector(dir, 1.4)
        .add(new THREE.Vector3(0, -0.2, 0));
}

function enterInspect(idx) {
    if (inspectMode) return;
    inspectMode  = true;
    inspectedIdx = idx;

    // Save envelope state
    savedEnvPos.copy(envMeshes[idx].position);
    savedEnvRot.copy(envMeshes[idx].rotation);

    // Unlock pointer — browser needs this for ESC to work
    if (document.pointerLockElement) document.exitPointerLock();

    // Prepare note (starts transparent, fades in)
    noteMeshes[idx].position.copy(getNoteTarget());
    noteMeshes[idx].quaternion.copy(camera.quaternion);
    noteMeshes[idx].visible = true;
    noteMeshes[idx].material.opacity = 0;

    document.getElementById('esc-hint').style.opacity = '1';
}

function exitInspect() {
    if (!inspectMode) return;
    const idx = inspectedIdx;

    // ── Hide note ──────────────────────────────────────────
    noteMeshes[idx].visible = false;
    noteMeshes[idx].material.opacity = 0;

    // ── Restore envelope to EXACT original position & rotation ──
    envMeshes[idx].position.copy(savedEnvPos);
    envMeshes[idx].rotation.copy(savedEnvRot);
    sealMeshes[idx].position.copy(savedEnvPos);
    sealMeshes[idx].position.y += 0.026;
    sealMeshes[idx].rotation.copy(savedEnvRot);

    inspectMode  = false;
    inspectedIdx = -1;
    document.getElementById('esc-hint').style.opacity = '0';
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && inspectMode) exitInspect();
});

// ─── Click to interact ───────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse2d   = new THREE.Vector2();

renderer.domElement.addEventListener('click', () => {
    if (inspectMode) return;
    if (!document.pointerLockElement) { renderer.domElement.requestPointerLock(); return; }

    mouse2d.set(0, 0);   // crosshair = screen centre
    raycaster.setFromCamera(mouse2d, camera);
    const hits = raycaster.intersectObjects(envMeshes);
    if (hits.length > 0) {
        const idx = envMeshes.indexOf(hits[0].object);
        enterInspect(idx);
        // Burst fireworks on click
        for (let b = 0; b < 4; b++) setTimeout(() => {
            launchFirework(
                REST_POS[idx].x + (Math.random() - 0.5) * 6,
                REST_POS[idx].y + 4 + Math.random() * 4,
                REST_POS[idx].z + (Math.random() - 0.5) * 6
            );
        }, b * 200);
    }
});

// ═══════════════════════════════════════════════════════════
//  FIREWORKS
// ═══════════════════════════════════════════════════════════
const fireworks = [];
const FW_COLS = [0xff3366,0xff6699,0xffcc00,0xff9900,0x66ffcc,0x00ccff,0xcc66ff,0xff66ff,0xffffff,0xffaacc,0xffff66];

function launchFirework(x, y, z) {
    const n = 160 + Math.floor(Math.random() * 80);
    const col = FW_COLS[Math.floor(Math.random() * FW_COLS.length)];
    const pos = new Float32Array(n * 3);
    const vel = [];
    for (let i = 0; i < n; i++) {
        pos[i*3]=x; pos[i*3+1]=y; pos[i*3+2]=z;
        const th=Math.random()*Math.PI*2, ph=Math.acos(2*Math.random()-1), sp=0.06+Math.random()*0.13;
        vel.push({ vx:sp*Math.sin(ph)*Math.cos(th), vy:sp*Math.sin(ph)*Math.sin(th), vz:sp*Math.cos(ph) });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color:col, size:0.22, transparent:true, opacity:1, sizeAttenuation:true }));
    scene.add(pts);
    fireworks.push({ pts, geo, vel, life:0, max:90+Math.floor(Math.random()*50) });
}

function updateFireworks() {
    for (let f = fireworks.length-1; f >= 0; f--) {
        const fw = fireworks[f]; fw.life++;
        const p = fw.geo.attributes.position.array;
        for (let i = 0; i < fw.vel.length; i++) {
            const v = fw.vel[i];
            v.vy -= 0.002; v.vx *= 0.972; v.vy *= 0.972; v.vz *= 0.972;
            p[i*3]+=v.vx; p[i*3+1]+=v.vy; p[i*3+2]+=v.vz;
        }
        fw.pts.material.opacity = 1 - fw.life/fw.max;
        fw.geo.attributes.position.needsUpdate = true;
        if (fw.life >= fw.max) {
            scene.remove(fw.pts); fw.geo.dispose(); fw.pts.material.dispose(); fireworks.splice(f,1);
        }
    }
}

// Auto fireworks — far from player
function scheduleFirework() {
    setTimeout(() => {
        const a=Math.random()*Math.PI*2, r=18+Math.random()*12;    // ← r = distance away
        launchFirework(Math.sin(a)*r, 9+Math.random()*9, Math.cos(a)*r); // ← height range
        scheduleFirework();
    }, 1800 + Math.random()*1600);
}
scheduleFirework();

// ═══════════════════════════════════════════════════════════
//  AMBIENT SPARKLES
// ═══════════════════════════════════════════════════════════
const particles = [];
function spawnParticle() {
    const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 5, 5),
        new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(Math.random(),1,0.65), transparent:true, opacity:0.9 })
    );
    p.position.set((Math.random()-0.5)*16, -0.3, (Math.random()-0.5)*16);
    p.userData.vy = 0.015+Math.random()*0.03; p.userData.life=0;
    scene.add(p); particles.push(p);
}
setInterval(spawnParticle, 120);

function updateParticles() {
    for (let i=particles.length-1; i>=0; i--) {
        const p=particles[i]; p.userData.life++;
        p.position.y+=p.userData.vy;
        p.position.x+=Math.sin(p.userData.life*0.07)*0.01;
        p.material.opacity=Math.max(0,1-p.userData.life/140);
        if (p.userData.life>140) { scene.remove(p); p.geometry.dispose(); p.material.dispose(); particles.splice(i,1); }
    }
}

// ═══════════════════════════════════════════════════════════
//  ANIMATION LOOP
// ═══════════════════════════════════════════════════════════
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    movePlayer();

    // Floating signs
    sign.position.y     = 3.5 + Math.sin(t * 0.7) * 0.1;
    signBack.position.y = 3.5 + Math.sin(t * 0.7) * 0.1;

    // Orbiting lights
    pinkLight.position.x   = Math.sin(t*0.45)*12; pinkLight.position.z   = Math.cos(t*0.45)*12;
    purpleLight.position.x = Math.cos(t*0.35)*12; purpleLight.position.z = Math.sin(t*0.35)*12;

    // ── Letter / note updates ───────────────────────────────
    for (let i = 0; i < 3; i++) {
        if (inspectMode && i === inspectedIdx) {
            // Smooth float note to in-front-of-player position
            const target = getNoteTarget();
            noteMeshes[i].position.lerp(target, 0.12);
            // Note always faces the camera (held horizontally to read)
            // Tilt slightly toward player like holding paper
            const q = camera.quaternion.clone();
            noteMeshes[i].quaternion.slerp(q, 0.1);

            // Fade note in
            noteMeshes[i].material.opacity = Math.min(1, noteMeshes[i].material.opacity + 0.04);

            // Envelope lifts slightly while open
            envMeshes[i].position.y = savedEnvPos.y + 0.25 + Math.sin(t*2)*0.03;

        } else if (!inspectMode) {
            // Gentle idle bob — envelopes rest flat on blanket
            envMeshes[i].position.y  = REST_POS[i].y + Math.sin(t*0.8 + i*1.2)*0.015;
            sealMeshes[i].position.y = envMeshes[i].position.y + 0.026;
        }
    }

    updateParticles();
    updateFireworks();
    renderer.render(scene, camera);
}

animate();