# Real-World Military/Space Force Data Requirements

## What Space Force/Air Force Actually Needs

### 1. Real Threat Scenarios They Care About

#### Current Real-World ASAT Threats:
- **Russia's Nudol (PL-19)**: Ground-launched, can reach up to 1,500km altitude
- **China's SC-19/DN-2**: Kinetic kill vehicle, demonstrated at 865km
- **India's Mission Shakti**: Demonstrated at 300km altitude
- **Co-orbital ASATs**: Russia's Cosmos 2542/2543 shadowing USA-245

#### Critical Data Points Military Analysts Need:
```json
{
  "threat_id": "2024-095A",
  "classification": "UNCLASSIFIED//FOUO",
  "threat_type": "kinetic_kill_vehicle",
  "launch_detection": {
    "time": "2024-03-15T14:23:45.123Z",
    "location": {
      "lat": 46.577,
      "lon": 42.683,
      "site_name": "Plesetsk Cosmodrome",
      "country": "RUS"
    },
    "detection_source": "SBIRS",
    "confidence": 0.98
  },
  "target_assessment": {
    "catalog_number": "48915",
    "satellite_name": "USA-328",
    "orbit_regime": "LEO",
    "altitude_km": 547,
    "inclination_deg": 53.2,
    "value": "HIGH",
    "mission": "ISR"
  },
  "intercept_parameters": {
    "time_to_intercept": 423,
    "probability_of_kill": 0.87,
    "miss_distance_km": 0.5,
    "closing_velocity_km_s": 14.2,
    "debris_cloud_estimate": 15000
  },
  "trajectory": [...],
  "uncertainty_ellipse": {
    "semi_major_km": 2.5,
    "semi_minor_km": 1.2,
    "orientation_deg": 47
  }
}
```

### 2. What Would "WOW" Them in Visualization

#### Red Watch (Tactical Analysis):
- **Real-time threat correlation**: Show multiple sensor feeds converging
- **Predictive intercept windows**: Not just one trajectory, but probability clouds
- **Debris field propagation**: Show Kessler syndrome effects post-impact
- **Decision timelines**: "You have 3:47 to decide on countermeasures"
- **Threat classification AI**: Auto-identify launch signatures

#### Red Orbit (Strategic View):
- **Global threat theater**: Show ALL satellites at risk simultaneously
- **Chain reaction modeling**: If X gets hit, show cascading debris threats
- **Keep-out zones**: Dynamic no-fly volumes around critical assets
- **Conjunction analysis**: Not just current, but 72-hour predictions
- **Multi-domain integration**: Ground radars + space sensors + cyber indicators

### 3. Real Data They'd Send Us

#### From Space Force/USSF:
```json
{
  "data_source": "18th Space Defense Squadron",
  "format": "TLE_PLUS",
  "ephemeris_type": "SGP4",
  "state_vectors": {
    "epoch": "2024-03-15T14:23:45.000Z",
    "position_teme": [3567.4, -2134.7, 5678.9],
    "velocity_teme": [4.532, 6.234, -1.234],
    "covariance_matrix": [[...]],
    "maneuver_capability": "LIMITED"
  },
  "sensor_tracks": [
    {
      "sensor_id": "GEODSS_SOCORRO",
      "observation_time": "2024-03-15T14:24:15.234Z",
      "azimuth": 234.56,
      "elevation": 45.67,
      "range_km": 1234.5,
      "range_rate_km_s": -12.3,
      "snr": 24.5
    }
  ]
}
```

#### From NRO/Intelligence:
- Multi-INT fusion data (SIGINT + MASINT + GEOINT)
- Pattern-of-life analysis on adversary satellites
- Launch preparation indicators
- Fuel loading signatures
- Communications intercepts suggesting intent

### 4. Features That Would Impress Them

#### Must-Have Capabilities:
1. **Multi-hypothesis tracking**: Show top 3 most likely targets
2. **Sensor tasking recommendations**: "Point radar here for confirmation"
3. **Automated threat briefing generation**: One-click PowerPoint export
4. **Historical pattern analysis**: "This matches their November 2023 test"
5. **Coalition data sharing**: NATO-compatible formats

#### Game-Changing Features:
1. **ML-based launch prediction**: "87% chance of launch in next 6 hours"
2. **Quantum radar integration**: See stealth satellites
3. **Cislunar tracking**: Beyond GEO to Moon orbit
4. **Hypersonic glide vehicle trajectories**: Non-ballistic paths
5. **Counter-ASAT recommendations**: Optimal defensive maneuvers

### 5. Realistic Test Scenarios We Should Build

#### Scenario 1: "Dragon's Reach"
- Chinese ASAT launch from Xichang
- Target: GPS III satellite at 20,200km
- Multiple interceptor stages
- Mid-course corrections based on tracking

#### Scenario 2: "Arctic Wolf"
- Russian co-orbital ASAT
- Already in orbit, maneuvering toward target
- Cat-and-mouse over 72 hours
- RPO (Rendezvous and Proximity Operations)

#### Scenario 3: "Kessler Cascade"
- Debris from destroyed satellite
- Threatens ISS and 47 other satellites
- Conjunction warnings every 90 minutes
- Emergency maneuver planning

#### Scenario 4: "Swarm Strike"
- 12 small satellites converging
- Coordinated from different orbits
- Formation flying attack pattern
- Overwhelming single target

### 6. Data Format They'd Actually Use

**Standard: CCSDS OMM (Orbit Mean-Elements Message)**
```xml
<omm>
  <header>
    <CREATION_DATE>2024-03-15T14:23:45</CREATION_DATE>
    <ORIGINATOR>18_SDS</ORIGINATOR>
  </header>
  <body>
    <segment>
      <metadata>
        <OBJECT_NAME>THREAT_2024_095A</OBJECT_NAME>
        <OBJECT_ID>2024-095A</OBJECT_ID>
        <CENTER_NAME>EARTH</CENTER_NAME>
        <REF_FRAME>TEME</REF_FRAME>
      </metadata>
      <data>
        <meanElements>
          <EPOCH>2024-03-15T14:23:45.000</EPOCH>
          <SEMI_MAJOR_AXIS units="km">7234.567</SEMI_MAJOR_AXIS>
          <ECCENTRICITY>0.0234567</ECCENTRICITY>
          <INCLINATION units="deg">51.6</INCLINATION>
        </meanElements>
      </data>
    </segment>
  </segment>
</omm>
```

### 7. What Would Make Generals Say "We Need This"

1. **Decision advantage timer**: "You'll know 4 minutes before adversary"
2. **Probabilistic kill web**: Show all defensive options ranked
3. **Attribution confidence**: "97% certain this is Russian"
4. **Collateral damage assessment**: Which commercial sats at risk
5. **Rules of Engagement checker**: Green/yellow/red for response options
6. **Coalition impact assessment**: "This affects 7 NATO members"
7. **Space weather integration**: Solar storm affecting tracking?
8. **Cyber correlation**: Matching space events with cyber attacks
9. **Mobile command integration**: Works on tablet in the field
10. **Classification handling**: Automatic portion marking

### 8. Performance Metrics They Track

- **Time to initial detection**: < 15 seconds from launch
- **Track correlation accuracy**: > 95% 
- **False alarm rate**: < 1 per month
- **Prediction accuracy at T-5 min**: < 1km error
- **System availability**: 99.99% uptime
- **Data latency**: < 500ms from sensor to screen

This is what real military/space operations need - not just pretty pictures, but actionable intelligence with confidence intervals, decision timelines, and clear risk assessments.