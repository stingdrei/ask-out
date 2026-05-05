const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

function createTextTexture(text) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 256;
    context.fillStyle = 'white';
    context.font = '40px Arial';
    context.fillText(text, 20, 130);
    return new THREE.CanvasTexture(canvas);
}

const signMaterial = new THREE.MeshBasicMaterial({ map: createTextTexture('Hello, World!') });
const signGeometry = new THREE.PlaneGeometry(4, 2);
const sign = new THREE.Mesh(signGeometry, signMaterial);
sign.position.set(0, 0, -5);
scene.add(sign);    

const letter = [];

for (let i = 0; i < 3; i++) {
    const letterGeometry = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.1, 1),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
    );

    letter.position.set(i * 2 -2, 0.5, 1);
    scene.add(letter);
    letter.push(letter);
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(letter);
    if (intersects.length > 0) {
        alert('You clicked on a letter!');
    }
});

const particles = [];

function createParticle() {
    const particleGeometry = new THREE.SphereGeometry(0.1);
    const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
    particle.position.set(0, 0, -5);
    scene.add(particle);
    particles.push(particle);
}

function animate() {
    requestAnimationFrame(animate);
    particles.forEach((particle) => {
        particle.position.y += 0.01;
    });
    renderer.render(scene, camera);
}
animate();

camera.position.z = 8;
camera.position.y = 3;
camera.lookAt(0, 0, 0);