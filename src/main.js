import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import * as lil from 'lil-gui';


import starsTexture from '../src/images/stars.jpg';
import sunTexture from '../src/images/sun.jpg';
import mercuryTexture from '../src/images/mercury.jpg';
import venusTexture from '../src/images/venus.jpg';
import earthTexture from '../src/images/earth.jpg';
import marsTexture from '../src/images/mars.jpg';
import jupiterTexture from '../src/images/jupiter.jpg';
import saturnTexture from '../src/images/saturn.jpg';
import saturnRingTexture from '../src/images/saturn_ring.png';
import uranusTexture from '../src/images/uranus.jpg';
import uranusRingTexture from '../src/images/uranus_ring.png';
import neptuneTexture from '../src/images/neptune.jpg';
import neptuneRingTexture from '../src/images/uranus_ring.png'; // reuse uranus ring for neptune

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas') });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const orbit = new OrbitControls(camera, renderer.domElement);
camera.position.set(-90, 140, 140);
orbit.update();

// Sun's light
const pointLight = new THREE.PointLight(0xFFFFFF, 2, 300);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

//ambient light
const ambientLight = new THREE.AmbientLight(0x333333, 3);
scene.add(ambientLight);

const cubeTextureloader = new THREE.CubeTextureLoader();
scene.background = cubeTextureloader.load([
  starsTexture, starsTexture, starsTexture,
  starsTexture, starsTexture, starsTexture
]);

const textureLoader = new THREE.TextureLoader();

//sun
const sunGeo = new THREE.SphereGeometry(16, 30, 30);
const sunMaterial = new THREE.MeshBasicMaterial({ map: textureLoader.load(sunTexture) });
const sun = new THREE.Mesh(sunGeo, sunMaterial);
scene.add(sun);

//function to create planets
function createPlanet(size, texture, position, ring) {
  const geo = new THREE.SphereGeometry(size, 30, 30);
  const material = new THREE.MeshStandardMaterial({ map: textureLoader.load(texture) });
  const mesh = new THREE.Mesh(geo, material);
  const obj = new THREE.Object3D();
  obj.add(mesh);
  if (ring) {
    const ringGeo = new THREE.RingGeometry(ring.innerRadius, ring.outerRadius, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({ map: textureLoader.load(ring.texture), side: THREE.DoubleSide });
    const ringMesh = new THREE.Mesh(ringGeo, ringMaterial);
    ringMesh.position.x = position;
    ringMesh.rotation.x = -0.5 * Math.PI;
    obj.add(ringMesh);
  }
  scene.add(obj);
  mesh.position.x = position;
  return { mesh, obj };
}

// Creating all planets 
const mercury = createPlanet(3.2, mercuryTexture, 28);
const venus = createPlanet(5.8, venusTexture, 44);
const earth = createPlanet(6, earthTexture, 62);
const mars = createPlanet(4, marsTexture, 78);
const jupiter = createPlanet(12, jupiterTexture, 100);
const saturn = createPlanet(10, saturnTexture, 138, {
  innerRadius: 10,
  outerRadius: 20,
  texture: saturnRingTexture
});
const uranus = createPlanet(7, uranusTexture, 176, {
  innerRadius: 7,
  outerRadius: 12,
  texture: uranusRingTexture
});
const neptune = createPlanet(7, neptuneTexture, 200, {
  innerRadius: 7,
  outerRadius: 12,
  texture: neptuneRingTexture
});


const orbitSpeeds = {
  mercury: 0.04,
  venus: 0.015,
  earth: 0.01,
  mars: 0.008,
  jupiter: 0.002,
  saturn: 0.0009,
  uranus: 0.0004,
  neptune: 0.0001,
};

const gui = new lil.GUI();

gui.add(orbitSpeeds, 'mercury', 0, 0.1).name('Mercury Speed');
gui.add(orbitSpeeds, 'venus', 0, 0.1).name('Venus Speed');
gui.add(orbitSpeeds, 'earth', 0, 0.1).name('Earth Speed');
gui.add(orbitSpeeds, 'mars', 0, 0.1).name('Mars Speed');
gui.add(orbitSpeeds, 'jupiter', 0, 0.1).name('Jupiter Speed');
gui.add(orbitSpeeds, 'saturn', 0, 0.01).name('Saturn Speed');
gui.add(orbitSpeeds, 'uranus', 0, 0.01).name('Uranus Speed');
gui.add(orbitSpeeds, 'neptune', 0, 0.01).name('Neptune Speed');

let isPaused = false;

const control = { pause: () => isPaused = !isPaused };
gui.add(control, 'pause').name('Pause/Resume');

function animate() {
  if (!isPaused) {
    sun.rotateY(0.004);
    mercury.mesh.rotateY(0.004);
    mercury.obj.rotateY(orbitSpeeds.mercury);
    venus.mesh.rotateY(0.002);
    venus.obj.rotateY(orbitSpeeds.venus);
    earth.mesh.rotateY(0.02);
    earth.obj.rotateY(orbitSpeeds.earth);
    mars.mesh.rotateY(0.018);
    mars.obj.rotateY(orbitSpeeds.mars);
    jupiter.mesh.rotateY(0.04);
    jupiter.obj.rotateY(orbitSpeeds.jupiter);
    saturn.mesh.rotateY(0.038);
    saturn.obj.rotateY(orbitSpeeds.saturn);
    uranus.mesh.rotateY(0.03);
    uranus.obj.rotateY(orbitSpeeds.uranus);
    neptune.mesh.rotateY(0.032);
    neptune.obj.rotateY(orbitSpeeds.neptune);
  }

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
