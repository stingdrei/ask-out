// ═══════════════════════════════════════════════════════════
//  ask-out  ·  Three.js  ·  360° Camera + Fireworks
//  Built on top of stingdrei's original code
// ═══════════════════════════════════════════════════════════

const scene    = new THREE.Scene();
const camera   = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x0a0010); // deep dark purple background
document.body.appendChild(renderer.domElement);

// ─── RESIZE ──────────────────────────────────────────────────
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ═══════════════════════════════════════════════════════════
//  360° ORBIT CAMERA  (drag any direction, scroll to zoom)
// ═══════════════════════════════════════════════════════════
const orbit = {
    theta:     0,
    phi:       Math.PI / 3,
    radius:    8,
    isDragging: false,
    lastX:     0,
    lastY:     0,
    target:    new THREE.Vector3(0, 1, 0),
};

function updateCamera() {
    // Clamp phi to prevent flipping
    orbit.phi = Math.max(0.05, Math.min(Math.PI - 0.05, orbit.phi));
    camera.position.x = orbit.target.x + orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta);
    camera.position.y = orbit.target.y + orbit.radius * Math.cos(orbit.phi);
    camera.position.z = orbit.target.z + orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta);
    camera.lookAt(orbit.target);
}
updateCamera();

// --- Mouse drag ---
renderer.domElement.addEventListener('mousedown', e => {
    orbit.isDragging = true;
    orbit.lastX = e.clientX;
    orbit.lastY = e.clientY;
});
window.addEventListener('mousemove', e => {
    if (!orbit.isDragging) return;
    orbit.theta -= (e.clientX - orbit.lastX) * 0.005;
    orbit.phi   += (e.clientY - orbit.lastY) * 0.005;
    orbit.lastX  = e.clientX;
    orbit.lastY  = e.clientY;
    updateCamera();
});
window.addEventListener('mouseup', () => { orbit.isDragging = false; });

// --- Touch drag ---
renderer.domElement.addEventListener('touchstart', e => {
    orbit.isDragging = true;
    orbit.lastX = e.touches[0].clientX;
    orbit.lastY = e.touches[0].clientY;
}, { passive: true });
window.addEventListener('touchmove', e => {
    if (!orbit.isDragging) return;
    orbit.theta -= (e.touches[0].clientX - orbit.lastX) * 0.005;
    orbit.phi   += (e.touches[0].clientY - orbit.lastY) * 0.005;
    orbit.lastX  = e.touches[0].clientX;
    orbit.lastY  = e.touches[0].clientY;
    updateCamera();
}, { passive: true });
window.addEventListener('touchend', () => { orbit.isDragging = false; });

// --- Scroll to zoom ---
window.addEventListener('wheel', e => {
    orbit.radius = Math.max(2, Math.min(20, orbit.radius + e.deltaY * 0.01));
    updateCamera();
});

// ═══════════════════════════════════════════════════════════
//  LIGHTS
// ═══════════════════════════════════════════════════════════
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const pinkLight = new THREE.PointLight(0xff69b4, 4, 30);
pinkLight.position.set(4, 5, 4);
scene.add(pinkLight);

const purpleLight = new THREE.PointLight(0xaa44ff, 4, 30);
purpleLight.position.set(-4, 3, -4);
scene.add(purpleLight);

// ═══════════════════════════════════════════════════════════
//  STARFIELD BACKGROUND
// ═══════════════════════════════════════════════════════════
const starGeo = new THREE.BufferGeometry();
const starCount = 1500;
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i++) starPos[i] = (Math.random() - 0.5) * 200;
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
scene.add(new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.75 })
));

// ═══════════════════════════════════════════════════════════
//  YOUR ORIGINAL CUBE  (upgraded to Phong + glow)
// ═══════════════════════════════════════════════════════════
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshPhongMaterial({
    color: 0x00ff88,
    emissive: 0x003322,
    shininess: 80,
});
const cube = new THREE.Mesh(geometry, material);
cube.position.set(-3, 0.5, 0);
scene.add(cube);

// ═══════════════════════════════════════════════════════════
//  TEXT TEXTURE HELPER  (your original function + glow)
// ═══════════════════════════════════════════════════════════
function createTextTexture(text, color = '#ffffff', fontSize = 48) {
    const canvas = document.createElement('canvas');
    canvas.width  = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font          = `bold ${fontSize}px Georgia, serif`;
    ctx.fillStyle     = color;
    ctx.textAlign     = 'center';
    ctx.textBaseline  = 'middle';
    ctx.shadowColor   = color;
    ctx.shadowBlur    = 22;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    return new THREE.CanvasTexture(canvas);
}

// ─── Main front sign ─────────────────────────────────────────
const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 1.5),
    new THREE.MeshBasicMaterial({
        map: createTextTexture('Will you go out with me? 💕', '#ff9ec4', 38),
        transparent: true,
        side: THREE.DoubleSide,
    })
);
sign.position.set(0, 2.5, -3);
scene.add(sign);

// ─── Back sign (visible when you orbit behind) ───────────────
const signBack = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 1.5),
    new THREE.MeshBasicMaterial({
        map: createTextTexture('Please say YES! 🌸', '#ffdf80', 42),
        transparent: true,
        side: THREE.DoubleSide,
    })
);
signBack.position.set(0, 2.5, 3);
signBack.rotation.y = Math.PI;
scene.add(signBack);

// ═══════════════════════════════════════════════════════════
//  YOUR ORIGINAL LETTER BLOCKS  (upgraded + labeled Y/E/S)
// ═══════════════════════════════════════════════════════════
const letter = [];
const letterColors = [0xff6699, 0xff99cc, 0xffccdd];

for (let i = 0; i < 3; i++) {
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.15, 1),
        new THREE.MeshPhongMaterial({
            color:     letterColors[i],
            emissive:  0x220011,
            shininess: 120,
        })
    );
    mesh.position.set(i * 2 - 2, 0.5, 1);
    scene.add(mesh);
    letter.push(mesh);

    // Y / E / S label on top
    const label = new THREE.Mesh(
        new THREE.PlaneGeometry(0.85, 0.85),
        new THREE.MeshBasicMaterial({
            map: createTextTexture(['Y', 'E', 'S'][i], '#ffffff', 90),
            transparent: true,
            side: THREE.DoubleSide,
        })
    );
    label.position.set(i * 2 - 2, 0.6, 1);
    label.rotation.x = -Math.PI / 2;
    scene.add(label);
}

// ═══════════════════════════════════════════════════════════
//  RAYCASTER  ── click Y/E/S blocks → burst fireworks
// ═══════════════════════════════════════════════════════════
const raycaster = new THREE.Raycaster();
const mouse     = new THREE.Vector2();

window.addEventListener('click', (event) => {
    if (orbit.isDragging) return;

    mouse.x =  (event.clientX / window.innerWidth)  * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(letter);
    if (intersects.length > 0) {
        const hit = intersects[0].object;
        // Launch several bursts from the clicked block
        for (let b = 0; b < 3; b++) {
            setTimeout(() => {
                launchFirework(
                    hit.position.x + (Math.random() - 0.5) * 2,
                    hit.position.y + 1 + Math.random() * 2,
                    hit.position.z + (Math.random() - 0.5) * 2
                );
            }, b * 200);
        }
    }
});

// ═══════════════════════════════════════════════════════════
//  FIREWORKS  ── full particle burst system
// ═══════════════════════════════════════════════════════════
const fireworks = [];

const FIREWORK_COLORS = [
    0xff3366, 0xff6699, 0xffcc00, 0xff9900,
    0x66ffcc, 0x00ccff, 0xcc66ff, 0xff66ff,
    0xffffff, 0xffaacc, 0xffff66,
];

function launchFirework(x, y, z) {
    const count = 140 + Math.floor(Math.random() * 80);
    const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];

    const positions  = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
        // Start at burst origin
        positions[i * 3]     = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        // Spherical random direction
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const speed = 0.05 + Math.random() * 0.1;
        velocities.push({
            vx: speed * Math.sin(phi) * Math.cos(theta),
            vy: speed * Math.sin(phi) * Math.sin(theta),
            vz: speed * Math.cos(phi),
        });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
        color,
        size: 0.2,
        transparent: true,
        opacity: 1,
        sizeAttenuation: true,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    fireworks.push({
        points,
        geo,
        velocities,
        life:    0,
        maxLife: 80 + Math.floor(Math.random() * 50),
    });
}

function updateFireworks() {
    for (let f = fireworks.length - 1; f >= 0; f--) {
        const fw = fireworks[f];
        fw.life++;

        const pos = fw.geo.attributes.position.array;
        const t   = fw.life / fw.maxLife;

        for (let i = 0; i < fw.velocities.length; i++) {
            const v = fw.velocities[i];
            v.vy -= 0.002;   // gravity
            v.vx *= 0.972;   // drag
            v.vy *= 0.972;
            v.vz *= 0.972;
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

// ─── Auto-launch random fireworks every 1.5–3s ───────────────
function scheduleRandomFirework() {
    setTimeout(() => {
        launchFirework(
            (Math.random() - 0.5) * 10,
            3 + Math.random() * 4,
            (Math.random() - 0.5) * 10
        );
        scheduleRandomFirework();
    }, 1500 + Math.random() * 1500);
}
scheduleRandomFirework();

// ═══════════════════════════════════════════════════════════
//  CONTINUOUS RISING PARTICLES  (your original particles)
// ═══════════════════════════════════════════════════════════
const particles = [];

function createParticle() {
    const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 5, 5),
        new THREE.MeshBasicMaterial({
            color:       new THREE.Color().setHSL(Math.random(), 1, 0.65),
            transparent: true,
            opacity:     0.9,
        })
    );
    p.position.set(
        (Math.random() - 0.5) * 10,
        -1,
        (Math.random() - 0.5) * 10
    );
    p.userData.vy   = 0.02 + Math.random() * 0.04;
    p.userData.life = 0;
    scene.add(p);
    particles.push(p);
}

setInterval(createParticle, 100);

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.userData.life++;
        p.position.y += p.userData.vy;
        p.position.x += Math.sin(p.userData.life * 0.07) * 0.012;
        p.material.opacity = Math.max(0, 1 - p.userData.life / 130);
        if (p.userData.life > 130) {
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

    // Spin cube
    cube.rotation.x += 0.008;
    cube.rotation.y += 0.012;

    // Float signs
    sign.position.y     = 2.5 + Math.sin(t * 0.8) * 0.12;
    signBack.position.y = 2.5 + Math.sin(t * 0.8) * 0.12;

    // Pulse letter blocks
    letter.forEach((l, i) => {
        l.position.y = 0.5 + Math.sin(t * 1.2 + i * 1.1) * 0.12;
        l.rotation.y += 0.005;
    });

    // Orbit lights
    pinkLight.position.x   = Math.sin(t * 0.5) * 6;
    pinkLight.position.z   = Math.cos(t * 0.5) * 6;
    purpleLight.position.x = Math.cos(t * 0.4) * 6;
    purpleLight.position.z = Math.sin(t * 0.4) * 6;

    updateParticles();
    updateFireworks();

    renderer.render(scene, camera);
}

animate();