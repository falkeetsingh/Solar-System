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

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas') });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const orbit = new OrbitControls(camera, renderer.domElement);
camera.position.set(-90, 140, 140);
orbit.update();

// Lighting - Improved solar system lighting
const pointLight = new THREE.PointLight(0xffffff, 5, 1000); // Increased intensity and range
pointLight.position.set(0, 0, 0); // Sun position
pointLight.castShadow = true;
scene.add(pointLight);

// Add ambient light for better visibility of planets
const ambientLight = new THREE.AmbientLight(0x404040, 0.3); // Softer ambient light
scene.add(ambientLight);

// Optional: Add a subtle directional light to enhance planet visibility
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(50, 50, 50);
scene.add(directionalLight);

// Background
const cubeTextureloader = new THREE.CubeTextureLoader();
scene.background = cubeTextureloader.load([
  starsTexture, starsTexture, starsTexture,
  starsTexture, starsTexture, starsTexture
]);

const textureLoader = new THREE.TextureLoader();

// Sun - Using emissive material so it glows independently of lighting
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(16, 30, 30),
  new THREE.MeshBasicMaterial({ 
    map: textureLoader.load(sunTexture),
    emissive: 0xffaa00,
    emissiveIntensity: 0.1
  })
);
scene.add(sun);

// Planet factory
function createPlanet(size, texture, position, ring) {
  const geo = new THREE.SphereGeometry(size, 30, 30);
  const material = new THREE.MeshStandardMaterial({ map: textureLoader.load(texture) });
  const mesh = new THREE.Mesh(geo, material);
  const obj = new THREE.Object3D();
  obj.add(mesh);
  
  if (ring) {
    const ringGeo = new THREE.RingGeometry(ring.innerRadius, ring.outerRadius, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      map: textureLoader.load(ring.texture),
      side: THREE.DoubleSide
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMaterial);
    ringMesh.position.x = position;
    ringMesh.rotation.x = -0.5 * Math.PI;
    obj.add(ringMesh);
  }
  
  scene.add(obj);
  mesh.position.x = position;
  return { mesh, obj };
}

// Planets
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
const neptune = createPlanet(7, neptuneTexture, 200);

// Store original positions for reset
const originalPositions = {
  mercury: mercury.mesh.position.clone(),
  venus: venus.mesh.position.clone(),
  earth: earth.mesh.position.clone(),
  mars: mars.mesh.position.clone(),
  jupiter: jupiter.mesh.position.clone(),
  saturn: saturn.mesh.position.clone(),
  uranus: uranus.mesh.position.clone(),
  neptune: neptune.mesh.position.clone()
};

// Speeds
const orbitSpeeds = {
  mercury: 0.04,
  venus: 0.015,
  earth: 0.01,
  mars: 0.008,
  jupiter: 0.002,
  saturn: 0.0009,
  uranus: 0.0004,
  neptune: 0.0001
};

const gui = new lil.GUI();
Object.keys(orbitSpeeds).forEach(planet => {
  gui.add(orbitSpeeds, planet, 0, planet === 'saturn' || planet === 'uranus' || planet === 'neptune' ? 0.01 : 0.1).name(`${planet[0].toUpperCase() + planet.slice(1)} Speed`);
});

let isPaused = false;
gui.add({ pause: () => isPaused = !isPaused }, 'pause').name('Pause/Resume');

// Scale factor for real positions - optimized for astronomy-engine
const scaleSettings = { factor: 5e-9, autoScale: true };
const scaleController = gui.add(scaleSettings, 'factor', 1e-11, 1e-6, 1e-11).name('Position Scale');
gui.add(scaleSettings, 'autoScale').name('Auto Scale');

// Reset to animated positions
gui.add({
  reset: () => {
    simulationMode = 'animated';
    resetToAnimatedPositions();
    const modeToggle = document.getElementById('modeToggle');
    if (modeToggle) modeToggle.value = 'animated';
  }
}, 'reset').name('Reset to Animated');

// Function to reset planets to their animated positions
function resetToAnimatedPositions() {
  Object.keys(originalPositions).forEach(planetName => {
    const planet = window[planetName];
    if (planet && planet.mesh) {
      planet.mesh.position.copy(originalPositions[planetName]);
      planet.obj.rotation.y = 0; // Reset orbit rotation
    }
  });
}

// Improved real-time fetch from backend with astronomy-engine support
async function setPlanetPositionsFromBackend(dateStr) {
  try {
    console.log(`Fetching positions for date: ${dateStr}`);
    
    const response = await fetch(`https://solar-system-0hc9.onrender.com/api/positons?date=${dateStr}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Backend response:', data);
    console.log(`Using calculation method: ${data.library}`);
    
    if (!data.positions || !data.success) {
      throw new Error('Invalid response format: missing positions data or calculation failed');
    }
    
    const { positions } = data;
    
    // Check if we got valid positions (not all zeros)
    const hasValidPositions = Object.values(positions).some(pos => 
      !pos.error && (Math.abs(pos.x) > 0 || Math.abs(pos.y) > 0 || Math.abs(pos.z) > 0)
    );
    
    if (!hasValidPositions) {
      throw new Error('All planetary positions are zero or invalid. Check backend calculation.');
    }
    
    // Calculate scale factor
    let scaleFactor = scaleSettings.factor;
    
    if (scaleSettings.autoScale) {
      // Find the maximum distance to auto-scale (excluding Earth which is at origin in geocentric)
      let maxDistance = 0;
      Object.entries(positions).forEach(([name, pos]) => {
        if (name !== 'earth' && pos.distance && pos.distance > maxDistance && !pos.error) {
          maxDistance = pos.distance;
        }
      });
      
      // Scale to fit within reasonable bounds (max distance ~200 units like Neptune)
      if (maxDistance > 0) {
        scaleFactor = 200 / maxDistance;
      } else {
        // If no valid distances, use a reasonable default for astronomy-engine data
        scaleFactor = data.library === 'astronomy-engine' ? 5e-9 : 1e-8;
      }
      
      console.log(`Auto-scaling with factor: ${scaleFactor.toExponential(2)} (max distance: ${maxDistance ? maxDistance.toExponential(2) : 'N/A'} km)`);
    }

    // Update planet positions
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const [name, pos] of Object.entries(positions)) {
      const planet = window[name];
      
      if (planet && planet.mesh) {
        if (pos.error) {
          console.warn(`${name} has calculation error: ${pos.error}`);
          errorCount++;
          continue;
        }
        
        // For real positions, reset obj rotation since we're positioning absolutely
        planet.obj.rotation.y = 0;
        
        const scaledX = pos.x * scaleFactor;
        const scaledY = pos.y * scaleFactor;
        const scaledZ = pos.z * scaleFactor;
        
        // Special handling for Earth in geocentric coordinates (should be at center)
        if (name === 'earth') {
          planet.mesh.position.set(0, 0, 0);
          console.log(`${name}: positioned at origin (geocentric center)`);
        } else {
          planet.mesh.position.set(scaledX, scaledY, scaledZ);
          console.log(`${name}:`, {
            original: `(${(pos.x/1e6).toFixed(1)}M, ${(pos.y/1e6).toFixed(1)}M, ${(pos.z/1e6).toFixed(1)}M) km`,
            scaled: `(${scaledX.toFixed(2)}, ${scaledY.toFixed(2)}, ${scaledZ.toFixed(2)})`,
            distance: pos.distance ? `${(pos.distance/1e6).toFixed(1)} million km` : 'N/A',
            method: pos.method || 'unknown'
          });
        }
        
        updatedCount++;
      } else {
        console.warn(`Planet ${name} not found or missing mesh`);
      }
    }
    
    console.log(`Successfully updated ${updatedCount} planets (${errorCount} errors) using ${data.library}`);
    
    // Update GUI scale factor display if auto-scaling - FIXED
    if (scaleSettings.autoScale) {
      scaleSettings.factor = scaleFactor;
      // Update the specific controller, not the GUI instance
      scaleController.updateDisplay();
    }
    
    // Show success message with method used
    const methodMessage = data.library === 'astronomy-engine' ? 'high-precision astronomy-engine' :
                         data.library === 'astronomia' ? 'astronomia library' : 
                         'approximate orbital calculations';
    console.log(`✅ Planetary positions updated using ${methodMessage}`);
    
  } catch (err) {
    console.error('Error fetching planet positions:', err);
    
    // More specific error messages
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      alert('Cannot connect to the backend server. Make sure it\'s running on port 3001.');
    } else if (err.message.includes('500')) {
      alert('Server error calculating positions. Check the backend logs.');
    } else if (err.message.includes('zero or invalid')) {
      alert('Backend returned invalid positions. Try a different date or check the server logs.');
    } else {
      alert(`Failed to fetch planet positions: ${err.message}`);
    }
  }
}

// Simulation toggle
let simulationMode = 'animated';
const modeToggle = document.getElementById('modeToggle');
if (modeToggle) {
  modeToggle.addEventListener('change', (e) => {
    simulationMode = e.target.value;
    if (simulationMode === 'animated') {
      resetToAnimatedPositions();
    }
    console.log(`Switched to ${simulationMode} mode`);
  });
}

const updateBtn = document.getElementById('updateBtn');
if (updateBtn) {
  updateBtn.addEventListener('click', () => {
    if (simulationMode === 'real') {
      const dateInput = document.getElementById('dateInput');
      const dateStr = dateInput ? dateInput.value : '';
      
      if (dateStr) {
        setPlanetPositionsFromBackend(dateStr);
      } else {
        alert('Please enter a valid date.');
      }
    } else {
      alert('Please switch to "Real Positions" mode first.');
    }
  });
}

// Animate loop
function animate() {
  if (!isPaused && simulationMode === 'animated') {
    // Only animate when in animated mode
    sun.rotateY(0.004);
    mercury.mesh.rotateY(0.004); mercury.obj.rotateY(orbitSpeeds.mercury);
    venus.mesh.rotateY(0.002); venus.obj.rotateY(orbitSpeeds.venus);
    earth.mesh.rotateY(0.02); earth.obj.rotateY(orbitSpeeds.earth);
    mars.mesh.rotateY(0.018); mars.obj.rotateY(orbitSpeeds.mars);
    jupiter.mesh.rotateY(0.04); jupiter.obj.rotateY(orbitSpeeds.jupiter);
    saturn.mesh.rotateY(0.038); saturn.obj.rotateY(orbitSpeeds.saturn);
    uranus.mesh.rotateY(0.03); uranus.obj.rotateY(orbitSpeeds.uranus);
    neptune.mesh.rotateY(0.032); neptune.obj.rotateY(orbitSpeeds.neptune);
  } else if (simulationMode === 'real') {
    // In real mode, still rotate the planets on their axis
    sun.rotateY(0.004);
    mercury.mesh.rotateY(0.004);
    venus.mesh.rotateY(0.002);
    earth.mesh.rotateY(0.02);
    mars.mesh.rotateY(0.018);
    jupiter.mesh.rotateY(0.04);
    saturn.mesh.rotateY(0.038);
    uranus.mesh.rotateY(0.03);
    neptune.mesh.rotateY(0.032);
  }

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

// Responsive
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Attach planets to window for external access
Object.assign(window, {
  mercury, venus, earth, mars, jupiter, saturn, uranus, neptune
});

// Enhanced test function for debugging with astronomy-engine
window.testBackend = async (date = '2005-11-01') => {
  console.log('Testing backend connection with astronomy-engine...');
  console.log(`Testing date: ${date}`);
  
  try {
    // First test the health endpoint
    const healthResponse = await fetch('https://solar-system-0hc9.onrender.com/health');
    const healthData = await healthResponse.json();
    console.log('Backend health:', healthData);
    
    // Then test positions
    await setPlanetPositionsFromBackend(date);
  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Additional debug function to compare calculation methods
window.compareMethods = async (date = '2005-11-01') => {
  console.log(`Comparing calculation methods for ${date}:`);
  
  try {
    const response = await fetch(`https://solar-system-0hc9.onrender.com/api/positions?date=${date}`);
    const data = await response.json();
    
    console.log('Calculation method used:', data.library);
    console.log('Heliocentric positions:', data.heliocentricPositions);
    console.log('Geocentric positions:', data.positions);
    
    // Show distance comparison
    Object.entries(data.positions).forEach(([name, pos]) => {
      if (name !== 'earth' && !pos.error) {
        console.log(`${name}: ${(pos.distance/1e6).toFixed(1)} million km from Earth`);
      }
    });
    
  } catch (error) {
    console.error('Comparison failed:', error);
  }
};