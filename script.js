// ═══════════════════════════════════════════════════════════
//  ask-out  ·  Three.js
//  Features: First-person look, table, letter inspect, fireworks
// ═══════════════════════════════════════════════════════════

const scene    = new THREE.Scene();
const camera   = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.setClearColor(0x0a0010);
document.body.appendChild(renderer.domElement);

// Expose canvas globally so index.html start button can call requestPointerLock on it
window.threeCanvas = renderer.domElement;

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ═══════════════════════════════════════════════════════════
//  FIRST-PERSON CAMERA  —  mouse moves camera freely (no click-drag)
// ═══════════════════════════════════════════════════════════
camera.position.set(0, 1.6, 3); // starting position: eye-level, a few units back

const look = {
    yaw:   0,    // horizontal rotation (left / right)
    pitch: 0,    // vertical tilt (up / down)
    locked: false, // true when pointer is locked
};

// ── SPEED CONTROLS ─────────────────────────────────────────
//   ↓ Change these values to adjust camera sensitivity
const MOUSE_SENSITIVITY = 0.0018;  // lower = slower, higher = faster
// ───────────────────────────────────────────────────────────

function updateCamera() {
    look.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, look.pitch));
    const dir = new THREE.Vector3(
        Math.sin(look.yaw)  * Math.cos(look.pitch),
        Math.sin(look.pitch),
        Math.cos(look.yaw)  * Math.cos(look.pitch)
    );
    camera.lookAt(camera.position.clone().add(dir));
}
updateCamera();

// Pointer lock is requested by the start button in index.html
// Re-lock when user clicks canvas after ESC (but not while inspecting)
renderer.domElement.addEventListener('click', () => {
    if (!inspectMode && !document.pointerLockElement) {
        renderer.domElement.requestPointerLock();
    }
});

document.addEventListener('pointerlockchange', () => {
    look.locked = document.pointerLockElement === renderer.domElement;
});

document.addEventListener('mousemove', e => {
    if (!look.locked) return;
    if (inspectMode) return; // freeze look while inspecting a letter

    //  ↓ MOUSE_SENSITIVITY controls how fast the camera turns
    look.yaw   -= e.movementX * MOUSE_SENSITIVITY;
    look.pitch -= e.movementY * MOUSE_SENSITIVITY;
    updateCamera();
});

// Touch fallback (mobile: drag to look)
const touch = { lastX: 0, lastY: 0, active: false };
renderer.domElement.addEventListener('touchstart', e => {
    touch.active = true;
    touch.lastX = e.touches[0].clientX;
    touch.lastY = e.touches[0].clientY;
}, { passive: true });
window.addEventListener('touchmove', e => {
    if (!touch.active || inspectMode) return;
    look.yaw   -= (e.touches[0].clientX - touch.lastX) * MOUSE_SENSITIVITY * 2;
    look.pitch -= (e.touches[0].clientY - touch.lastY) * MOUSE_SENSITIVITY * 2;
    touch.lastX = e.touches[0].clientX;
    touch.lastY = e.touches[0].clientY;
    updateCamera();
}, { passive: true });
window.addEventListener('touchend', () => { touch.active = false; });

// ═══════════════════════════════════════════════════════════
//  LIGHTS
// ═══════════════════════════════════════════════════════════
scene.add(new THREE.AmbientLight(0xffffff, 0.35));

const pinkLight = new THREE.PointLight(0xff69b4, 5, 40);
pinkLight.position.set(4, 6, 4);
pinkLight.castShadow = true;
scene.add(pinkLight);

const purpleLight = new THREE.PointLight(0xaa44ff, 5, 40);
purpleLight.position.set(-4, 4, -4);
scene.add(purpleLight);

const tableLight = new THREE.PointLight(0xffffff, 2, 10);
tableLight.position.set(0, 4, -4);
scene.add(tableLight);

// ═══════════════════════════════════════════════════════════
//  STARFIELD
// ═══════════════════════════════════════════════════════════
const starGeo = new THREE.BufferGeometry();
const starCount = 2000;
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i++) starPos[i] = (Math.random() - 0.5) * 300;
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
scene.add(new THREE.Points(starGeo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.8 })
));

// ═══════════════════════════════════════════════════════════
//  FLOOR
// ═══════════════════════════════════════════════════════════
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshPhongMaterial({ color: 0x110022, shininess: 30 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.01;
floor.receiveShadow = true;
scene.add(floor);

// ═══════════════════════════════════════════════════════════
//  DECORATIVE CUBE  (original, kept)
// ═══════════════════════════════════════════════════════════
const cube = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshPhongMaterial({ color: 0x00ff88, emissive: 0x003322, shininess: 80 })
);
cube.position.set(-7, 1, -7);
cube.castShadow = true;
scene.add(cube);

// ═══════════════════════════════════════════════════════════
//  TEXT TEXTURE HELPER
// ═══════════════════════════════════════════════════════════
function createTextTexture(text, color = '#ffffff', fontSize = 48, canvasW = 1024, canvasH = 256) {
    // ↑ canvasW / canvasH — increase for sharper / wider text boxes
    const canvas = document.createElement('canvas');
    canvas.width  = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasW, canvasH);
    ctx.font         = `bold ${fontSize}px Georgia, serif`;
    ctx.fillStyle    = color;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor  = color;
    ctx.shadowBlur   = 24;
    ctx.fillText(text, canvasW / 2, canvasH / 2);
    return new THREE.CanvasTexture(canvas);
}

// ═══════════════════════════════════════════════════════════
//  SIGNS  (wider PlaneGeometry + larger canvas = no cutoff)
// ═══════════════════════════════════════════════════════════

// Front sign — visible straight ahead from start
const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 1.8),   // ← width increased (was 5)
    new THREE.MeshBasicMaterial({
        map: createTextTexture('Will you go out with me? 💕', '#ff9ec4', 52, 1024, 256),
        transparent: true,
        side: THREE.DoubleSide,
    })
);
sign.position.set(0, 3.2, -9);
scene.add(sign);

// Back sign — turn around to read it
const signBack = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 1.8),   // ← width increased
    new THREE.MeshBasicMaterial({
        map: createTextTexture('Please say YES! 🌸', '#ffdf80', 56, 1024, 256),
        transparent: true,
        side: THREE.DoubleSide,
    })
);
signBack.position.set(0, 3.2, 9);
signBack.rotation.y = Math.PI;
scene.add(signBack);

// ═══════════════════════════════════════════════════════════
//  TABLE
// ═══════════════════════════════════════════════════════════
const tableMat = new THREE.MeshPhongMaterial({ color: 0x5c3317, shininess: 60 });

// Tabletop
const tabletop = new THREE.Mesh(new THREE.BoxGeometry(7, 0.18, 3), tableMat);
tabletop.position.set(0, 1.05, -5);
tabletop.castShadow  = true;
tabletop.receiveShadow = true;
scene.add(tabletop);

// Four legs
const legGeo = new THREE.BoxGeometry(0.18, 1.05, 0.18);
[[-3.3, -1], [3.3, -1], [-3.3, 1], [3.3, 1]].forEach(([x, zOff]) => {
    const leg = new THREE.Mesh(legGeo, tableMat);
    leg.position.set(x, 0.525, -5 + zOff);
    leg.castShadow = true;
    scene.add(leg);
});

// ═══════════════════════════════════════════════════════════
//  LETTER BLOCKS  on the table
// ═══════════════════════════════════════════════════════════
const letter       = [];   // clickable block meshes
const letterLabels = [];   // top-face label planes
const letterColors = [0xff6699, 0xff99cc, 0xffccdd];
const YES          = ['Y', 'E', 'S'];

// Resting positions on the table (world space)
const TABLE_Y  = 1.14 + 0.075; // tabletop top surface + half block height
const TABLE_Z  = -5;

for (let i = 0; i < 3; i++) {
    const blockX = (i - 1) * 2; // -2, 0, +2

    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.15, 1),
        new THREE.MeshPhongMaterial({ color: letterColors[i], emissive: 0x220011, shininess: 120 })
    );
    mesh.position.set(blockX, TABLE_Y, TABLE_Z);
    mesh.castShadow = true;
    scene.add(mesh);
    letter.push(mesh);

    // Letter label on top face
    const label = new THREE.Mesh(
        new THREE.PlaneGeometry(0.85, 0.85),
        new THREE.MeshBasicMaterial({
            map: createTextTexture(YES[i], '#ffffff', 100, 256, 256),
            transparent: true,
            side: THREE.DoubleSide,
        })
    );
    label.position.set(blockX, TABLE_Y + 0.08, TABLE_Z);
    label.rotation.x = -Math.PI / 2;
    scene.add(label);
    letterLabels.push(label);
}

// ═══════════════════════════════════════════════════════════
//  INSPECT MODE  —  click a letter → floats in front of camera
//                   press ESC → returns to table
// ═══════════════════════════════════════════════════════════
let inspectMode   = false;
let inspectedIdx  = -1;       // which letter (0/1/2) is being inspected
let inspectLerp   = 0;        // 0 = at table, 1 = in front of camera

// Saved world-space rest transform per letter
const restPositions = letter.map(l => l.position.clone());

// Where "in front of camera" is computed each frame dynamically
function getInspectTarget() {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    return camera.position.clone().add(dir.multiplyScalar(1.5)).add(new THREE.Vector3(0, -0.1, 0));
}

function enterInspect(idx) {
    inspectMode   = true;
    inspectedIdx  = idx;
    inspectLerp   = 0;
    // Release pointer lock so ESC works normally
    if (document.pointerLockElement) document.exitPointerLock();
    // Show ESC hint
    document.getElementById('esc-hint').style.opacity = '1';
}

function exitInspect() {
    inspectMode  = false;
    inspectedIdx = -1;
    document.getElementById('esc-hint').style.opacity = '0';
}

// ESC key
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && inspectMode) {
        exitInspect();
    }
});

// ─── Raycaster click ─────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse     = new THREE.Vector2();

// We need to detect clicks differently:
// - if pointer is locked, fire from screen centre
// - if not locked (after inspect exit), fire from mouse pos
let lastMousePos = { x: 0, y: 0 };
document.addEventListener('mousemove', e => {
    lastMousePos.x = e.clientX;
    lastMousePos.y = e.clientY;
});

renderer.domElement.addEventListener('click', () => {
    if (inspectMode) return; // don't re-click while inspecting

    if (look.locked) {
        // Pointer locked → ray from exact screen centre
        mouse.set(0, 0);
    } else {
        mouse.x =  (lastMousePos.x / window.innerWidth)  * 2 - 1;
        mouse.y = -(lastMousePos.y / window.innerHeight) * 2 + 1;
    }

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(letter);
    if (hits.length > 0) {
        const idx = letter.indexOf(hits[0].object);
        enterInspect(idx);
        // Fireworks burst from the letter
        for (let b = 0; b < 4; b++) {
            setTimeout(() => {
                const p = restPositions[idx];
                launchFirework(
                    p.x + (Math.random() - 0.5) * 4,
                    p.y + 2 + Math.random() * 3,
                    p.z + (Math.random() - 0.5) * 4
                );
            }, b * 180);
        }
    }
});

// ═══════════════════════════════════════════════════════════
//  FIREWORKS  —  spawned far from player
// ═══════════════════════════════════════════════════════════
const fireworks = [];

const FIREWORK_COLORS = [
    0xff3366, 0xff6699, 0xffcc00, 0xff9900,
    0x66ffcc, 0x00ccff, 0xcc66ff, 0xff66ff,
    0xffffff, 0xffaacc, 0xffff66,
];

function launchFirework(x, y, z) {
    const count = 160 + Math.floor(Math.random() * 80);
    const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];

    const positions  = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
        positions[i * 3]     = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const speed = 0.06 + Math.random() * 0.12;
        velocities.push({
            vx: speed * Math.sin(phi) * Math.cos(theta),
            vy: speed * Math.sin(phi) * Math.sin(theta),
            vz: speed * Math.cos(phi),
        });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color, size: 0.22, transparent: true, opacity: 1, sizeAttenuation: true });
    const points = new THREE.Points(geo, mat);
    scene.add(points);
    fireworks.push({ points, geo, velocities, life: 0, maxLife: 90 + Math.floor(Math.random() * 50) });
}

function updateFireworks() {
    for (let f = fireworks.length - 1; f >= 0; f--) {
        const fw = fireworks[f];
        fw.life++;
        const pos = fw.geo.attributes.position.array;
        const t   = fw.life / fw.maxLife;
        for (let i = 0; i < fw.velocities.length; i++) {
            const v = fw.velocities[i];
            v.vy -= 0.0022;
            v.vx *= 0.970; v.vy *= 0.970; v.vz *= 0.970;
            pos[i * 3]     += v.vx;
            pos[i * 3 + 1] += v.vy;
            pos[i * 3 + 2] += v.vz;
        }
        fw.points.material.opacity = 1 - t;
        fw.geo.attributes.position.needsUpdate = true;
        if (fw.life >= fw.maxLife) {
            scene.remove(fw.points);
            fw.geo.dispose();
            fw.points.material.dispose();
            fireworks.splice(f, 1);
        }
    }
}

// Auto fireworks — spawned FAR from player (radius 18–28 units away)
function scheduleRandomFirework() {
    setTimeout(() => {
        // Pick a random angle around the player and push it far out
        const angle  = Math.random() * Math.PI * 2;
        const radius = 18 + Math.random() * 10;  // ← distance from player; increase to push further
        launchFirework(
            Math.sin(angle) * radius,
            8 + Math.random() * 8,               // ← height range of auto fireworks
            Math.cos(angle) * radius
        );
        scheduleRandomFirework();
    }, 1800 + Math.random() * 1600);
}
scheduleRandomFirework();

// ═══════════════════════════════════════════════════════════
//  RISING PARTICLES  (ambient floaty sparkles)
// ═══════════════════════════════════════════════════════════
const particles = [];

function createParticle() {
    const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 5, 5),
        new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL(Math.random(), 1, 0.65),
            transparent: true, opacity: 0.9,
        })
    );
    p.position.set((Math.random() - 0.5) * 14, -0.5, (Math.random() - 0.5) * 14);
    p.userData.vy   = 0.018 + Math.random() * 0.035;
    p.userData.life = 0;
    scene.add(p);
    particles.push(p);
}
setInterval(createParticle, 110);

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.userData.life++;
        p.position.y += p.userData.vy;
        p.position.x += Math.sin(p.userData.life * 0.07) * 0.012;
        p.material.opacity = Math.max(0, 1 - p.userData.life / 140);
        if (p.userData.life > 140) {
            scene.remove(p);
            p.geometry.dispose();
            p.material.dispose();
            particles.splice(i, 1);
        }
    }
}

// ═══════════════════════════════════════════════════════════
//  ANIMATION LOOP
// ═══════════════════════════════════════════════════════════
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // Spin decorative cube
    cube.rotation.x += 0.008;
    cube.rotation.y += 0.012;

    // Float signs
    sign.position.y     = 3.2 + Math.sin(t * 0.7) * 0.12;
    signBack.position.y = 3.2 + Math.sin(t * 0.7) * 0.12;

    // Orbit lights
    pinkLight.position.x   = Math.sin(t * 0.45) * 10;
    pinkLight.position.z   = Math.cos(t * 0.45) * 10;
    purpleLight.position.x = Math.cos(t * 0.35) * 10;
    purpleLight.position.z = Math.sin(t * 0.35) * 10;

    // ── Letter blocks ──────────────────────────────────────
    for (let i = 0; i < letter.length; i++) {
        const mesh  = letter[i];
        const label = letterLabels[i];

        if (inspectMode && i === inspectedIdx) {
            // ── INSPECT: smoothly float letter in front of camera ──
            inspectLerp = Math.min(1, inspectLerp + 0.04); // ← speed of float-in animation
            const target = getInspectTarget();
            mesh.position.lerp(target, 0.12);
            // Spin slowly while inspected
            mesh.rotation.y += 0.02;
            // Label follows
            label.position.copy(mesh.position).y += 0.09;
            label.rotation.set(0, mesh.rotation.y, 0); // face camera-ish
        } else if (!inspectMode && i === inspectedIdx && inspectedIdx !== -1) {
            // Just exited — snap back
            mesh.position.lerp(restPositions[i], 0.1);
            mesh.rotation.y += 0.005;
            label.position.set(restPositions[i].x, TABLE_Y + 0.08, TABLE_Z);
            label.rotation.set(-Math.PI / 2, 0, 0);
            if (mesh.position.distanceTo(restPositions[i]) < 0.01) inspectedIdx = -1;
        } else {
            // Normal idle bob on table
            mesh.position.y = TABLE_Y + Math.sin(t * 1.1 + i * 1.2) * 0.05;
            mesh.rotation.y += 0.005;
            label.position.set(restPositions[i].x, mesh.position.y + 0.09, TABLE_Z);
            label.rotation.set(-Math.PI / 2, 0, 0);
        }
    }

    updateParticles();
    updateFireworks();
    renderer.render(scene, camera);
}

animate();