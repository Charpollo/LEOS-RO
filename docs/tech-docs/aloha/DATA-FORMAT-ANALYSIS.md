# ALOHA Data Format Analysis
## Is Our Format Universal and Accurate?

---

## Current ALOHA Format

```json
{
  "id": "trajectory_identifier",
  "epoch": "2025-01-01T12:00:00Z",
  "frame": "TEME",
  "trajectory": [
    [time_seconds, x_km, y_km, z_km],
    [0, 3252.3, -3713.3, -4025.7],
    [1, 3252.5, -3713.5, -4025.9]
  ]
}
```

---

## Industry Standard Formats

### 1. **CCSDS OMM/OEM** (Space Industry Standard)
```xml
CCSDS_OEM_VERS = 2.0
CREATION_DATE = 2025-01-01T12:00:00
ORIGINATOR = SPACE-TRACK

META_START
OBJECT_NAME = USA-328
OBJECT_ID = 2024-001A
REF_FRAME = TEME
TIME_SYSTEM = UTC
META_STOP

EPHEMERIS_START
2025-01-01T12:00:00 3252.3 -3713.3 -4025.7 2.1 3.4 -1.2
2025-01-01T12:00:01 3252.5 -3713.5 -4025.9 2.1 3.4 -1.2
EPHEMERIS_STOP
```

### 2. **TLE (Two-Line Elements)** - Most Common
```
USA 328
1 48915U 21055A   24365.23456789  .00000000  00000-0  00000-0 0  9999
2 48915  53.0540 123.4567 0001234  90.1234 270.1234 15.48919393123456
```

### 3. **STK Ephemeris Format**
```
stk.v.11.0
BEGIN Ephemeris
ScenarioEpoch 1 Jan 2025 12:00:00.000
InterpolationMethod Lagrange
InterpolationOrder 5
BEGIN Data
0.0 3252.3 -3713.3 -4025.7
1.0 3252.5 -3713.5 -4025.9
END Data
END Ephemeris
```

### 4. **JSON (Various Implementations)**

**SpaceX/Starlink Format:**
```json
{
  "version": "1.0",
  "satellite": {
    "id": "STARLINK-1234",
    "epoch": "2025-01-01T12:00:00Z"
  },
  "states": [
    {
      "t": 0,
      "position": [3252.3, -3713.3, -4025.7],
      "velocity": [2.1, 3.4, -1.2]
    }
  ]
}
```

**ESA Format:**
```json
{
  "header": {
    "mission": "Sentinel-1A",
    "frame": "J2000",
    "units": {
      "position": "km",
      "velocity": "km/s"
    }
  },
  "trajectory": {
    "epoch": "2025-01-01T12:00:00.000",
    "states": [[t, x, y, z, vx, vy, vz]]
  }
}
```

---

## Analysis: Is Our Format Universal?

### ✅ What We Do Right
1. **JSON format** - Modern and widely supported
2. **TEME frame** - Standard reference frame
3. **ISO 8601 timestamps** - Universal time format
4. **Simple array structure** - Easy to parse
5. **Kilometers unit** - Standard for space

### ⚠️ What's Missing for Universal Use
1. **No velocity data** - Most formats include velocity
2. **No metadata** - Object name, mass, area, etc.
3. **No covariance** - Uncertainty information
4. **No interpolation method** - How to handle gaps
5. **No header version** - Format versioning

### 🔄 Conversion Difficulty

| From Format | To ALOHA | Difficulty | Issues |
|-------------|----------|------------|--------|
| CCSDS OEM | Easy | ⭐ | Just extract position, ignore velocity |
| TLE | Hard | ⭐⭐⭐ | Need SGP4 propagator |
| STK | Easy | ⭐ | Direct position mapping |
| SpaceX JSON | Easy | ⭐ | Extract position arrays |
| ESA JSON | Easy | ⭐ | Similar structure |

---

## Recommendations for Universal Format

### Minimal Enhancement (Keep Compatibility)
```json
{
  "version": "1.0",
  "id": "trajectory_identifier",
  "epoch": "2025-01-01T12:00:00Z",
  "frame": "TEME",
  "units": {
    "position": "km",
    "time": "seconds"
  },
  "trajectory": [
    [0, 3252.3, -3713.3, -4025.7],
    [1, 3252.5, -3713.5, -4025.9]
  ]
}
```

### Full Enhancement (Industry Compatible)
```json
{
  "version": "2.0",
  "metadata": {
    "object_name": "ASAT-001",
    "object_id": "2025-001A",
    "originator": "ALOHA",
    "creation_date": "2025-01-01T12:00:00Z"
  },
  "reference": {
    "frame": "TEME",
    "epoch": "2025-01-01T12:00:00Z",
    "time_system": "UTC"
  },
  "units": {
    "position": "kilometers",
    "velocity": "kilometers_per_second",
    "time": "seconds_from_epoch"
  },
  "states": [
    {
      "t": 0,
      "r": [3252.3, -3713.3, -4025.7],
      "v": [2.1, 3.4, -1.2],
      "cov": null
    }
  ]
}
```

---

## Converter Functions Needed

### From TLE
```javascript
import * as satellite from 'satellite.js';

function tleToAloha(tle1, tle2, startTime, endTime, stepSeconds) {
  const satrec = satellite.twoline2satrec(tle1, tle2);
  const trajectory = [];
  
  for (let t = 0; t <= endTime - startTime; t += stepSeconds) {
    const time = new Date(startTime.getTime() + t * 1000);
    const positionAndVelocity = satellite.propagate(satrec, time);
    const position = positionAndVelocity.position;
    
    trajectory.push([
      t,
      position.x,
      position.y,
      position.z
    ]);
  }
  
  return {
    id: satrec.satnum,
    epoch: startTime.toISOString(),
    frame: "TEME",
    trajectory: trajectory
  };
}
```

### From CCSDS OEM
```javascript
function oemToAloha(oemText) {
  const lines = oemText.split('\n');
  const trajectory = [];
  let epoch = null;
  let inData = false;
  
  for (const line of lines) {
    if (line.includes('EPHEMERIS_START')) {
      inData = true;
      continue;
    }
    if (line.includes('EPHEMERIS_STOP')) {
      break;
    }
    if (inData) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 4) {
        if (!epoch) epoch = parts[0];
        const t = trajectory.length;
        trajectory.push([t, 
          parseFloat(parts[1]),
          parseFloat(parts[2]),
          parseFloat(parts[3])
        ]);
      }
    }
  }
  
  return {
    id: "imported_oem",
    epoch: epoch,
    frame: "TEME",
    trajectory: trajectory
  };
}
```

---

## Summary

### Is Our Format Universal?
**Partially.** It's simple JSON which is good, but lacks industry-standard metadata and velocity data.

### Is It Accurate?
**Yes for position.** The TEME coordinates and kilometer units are correct. But professional systems expect:
- Velocity vectors
- Uncertainty/covariance
- Object metadata
- Format versioning

### Should Others Use Our Format?
**For simple visualization: YES**
- Easy to generate
- Easy to parse
- Minimal complexity

**For professional space ops: NO**
- Use CCSDS standards
- Include velocity and covariance
- Add proper metadata

### Recommendation
Keep current format for simplicity, but add converters from standard formats (TLE, CCSDS) so ALOHA can ingest industry data.