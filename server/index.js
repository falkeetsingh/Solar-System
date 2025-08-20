const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Try to load astronomy-engine (more reliable alternative)
let astronomy;
let astronomyAvailable = false;

try {
  astronomy = require('astronomy-engine');
  astronomyAvailable = true;
  console.log('✅ astronomy-engine library loaded successfully');
} catch (error) {
  console.log('⚠️  astronomy-engine not available:', error.message);
  console.log('📦 Install with: npm install astronomy-engine');
}

const AU = 149597870.7; // km

// Planet list for astronomy-engine
const planets = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];

function calculateWithAstronomyEngine(date) {
  const positions = {};

  const astroDate = new astronomy.AstroTime(date);
  
  for (const planetName of planets) {
    try {
      // Get heliocentric position
      const helioPos = astronomy.HelioVector(planetName, astroDate);
      
      positions[planetName.toLowerCase()] = {
        x: helioPos.x * AU,
        y: helioPos.y * AU, 
        z: helioPos.z * AU,
        distance: Math.sqrt(helioPos.x**2 + helioPos.y**2 + helioPos.z**2) * AU,
        method: 'astronomy-engine'
      };
      
    } catch (error) {
      console.error(`Error calculating ${planetName}:`, error);
      positions[planetName.toLowerCase()] = {
        x: 0, y: 0, z: 0, distance: 0,
        error: error.message,
        method: 'error'
      };
    }
  }
  
  return positions;
}

function calculateApproximatePositions(jd) {
  const orbitalElements = {
    mercury: { a: 0.387098, e: 0.205630, i: 7.005, L: 252.251, w: 77.456, n: 4.092317 },
    venus: { a: 0.723332, e: 0.006772, i: 3.395, L: 181.980, w: 131.533, n: 1.602136 },
    earth: { a: 1.000000, e: 0.016709, i: 0.000, L: 100.464, w: 102.937, n: 0.985608 },
    mars: { a: 1.523662, e: 0.093412, i: 1.850, L: 355.433, w: 336.041, n: 0.524039 },
    jupiter: { a: 5.204267, e: 0.048775, i: 1.303, L: 34.351, w: 14.331, n: 0.083056 },
    saturn: { a: 9.537070, e: 0.053362, i: 2.484, L: 50.078, w: 92.432, n: 0.033371 },
    uranus: { a: 19.191264, e: 0.047220, i: 0.773, L: 314.200, w: 172.884, n: 0.011698 },
    neptune: { a: 30.068963, e: 0.008586, i: 1.770, L: 304.880, w: 46.727, n: 0.005965 }
  };
  
  const positions = {};
  const t = jd - 2451545.0;
  
  for (const [name, elem] of Object.entries(orbitalElements)) {
    try {
      const L = elem.L + elem.n * t;
      const M = (L - elem.w) * Math.PI / 180;
      
      let E = M + elem.e * Math.sin(M);
      for (let i = 0; i < 3; i++) {
        E = M + elem.e * Math.sin(E);
      }
      
      const nu = 2 * Math.atan2(
        Math.sqrt(1 + elem.e) * Math.sin(E/2),
        Math.sqrt(1 - elem.e) * Math.cos(E/2)
      );
      
      const r = elem.a * (1 - elem.e * Math.cos(E));
      const lon = (elem.w + nu * 180 / Math.PI) * Math.PI / 180;
      
      positions[name] = {
        x: r * Math.cos(lon) * AU,
        y: 0,
        z: r * Math.sin(lon) * AU,
        distance: r * AU,
        method: 'approximate'
      };
      
    } catch (error) {
      positions[name] = { x: 0, y: 0, z: 0, distance: 0, error: error.message };
    }
  }
  
  return positions;
}

function convertToGeocentric(heliocentricPositions) {
  const earthPos = heliocentricPositions.earth;
  const geocentricPositions = {};
  
  for (const [name, pos] of Object.entries(heliocentricPositions)) {
    if (name === 'earth') {
      geocentricPositions[name] = {
        x: 0, y: 0, z: 0, distance: 0,
        method: pos.method
      };
    } else if (!pos.error) {
      geocentricPositions[name] = {
        x: pos.x - earthPos.x,
        y: pos.y - earthPos.y,
        z: pos.z - earthPos.z,
        distance: Math.sqrt(
          Math.pow(pos.x - earthPos.x, 2) +
          Math.pow(pos.y - earthPos.y, 2) +
          Math.pow(pos.z - earthPos.z, 2)
        ),
        method: pos.method
      };
    } else {
      geocentricPositions[name] = pos;
    }
  }
  
  return geocentricPositions;
}

app.get('/api/positions', (req, res) => {
  const { date } = req.query;
  
  if (!date) {
    return res.status(400).json({ 
      error: 'Please provide a date in YYYY-MM-DD format',
      example: '2005-11-01'
    });
  }

  try {
    const inputDate = new Date(date);
    
    if (isNaN(inputDate.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid date format. Please use YYYY-MM-DD format',
        provided: date
      });
    }
    
    console.log(`Calculating positions for date: ${date}`);
    
    let heliocentricPositions;
    let library = 'approximate';
    
    if (astronomyAvailable) {
      try {
        console.log('Using astronomy-engine...');
        heliocentricPositions = calculateWithAstronomyEngine(inputDate);
        library = 'astronomy-engine';
      } catch (error) {
        console.log('astronomy-engine failed, using approximate:', error.message);
        // Calculate JD for fallback
        const a = Math.floor((14 - (inputDate.getMonth() + 1)) / 12);
        const y = inputDate.getFullYear() + 4800 - a;
        const m = (inputDate.getMonth() + 1) + 12 * a - 3;
        const jd = inputDate.getDate() + Math.floor((153 * m + 2) / 5) + 365 * y + 
                   Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
        heliocentricPositions = calculateApproximatePositions(jd);
      }
    } else {
      console.log('Using approximate calculations...');
      const a = Math.floor((14 - (inputDate.getMonth() + 1)) / 12);
      const y = inputDate.getFullYear() + 4800 - a;
      const m = (inputDate.getMonth() + 1) + 12 * a - 3;
      const jd = inputDate.getDate() + Math.floor((153 * m + 2) / 5) + 365 * y + 
                 Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
      heliocentricPositions = calculateApproximatePositions(jd);
    }
    
    const geocentricPositions = convertToGeocentric(heliocentricPositions);
    
    res.json({
      date,
      positions: geocentricPositions,
      heliocentricPositions,
      success: true,
      library
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Internal error calculating positions',
      details: error.message,
      date
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    astronomyEngine: astronomyAvailable 
  });
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`🚀 Solar System API running on https://solar-system-silk-mu.vercel.app/`);
});