{
  "exportDate": "2025-08-12T16:23:23.606Z",
  "event": {
    "id": "conj_1755015733694_zj246vew8",                    //  HAVE
    "timestamp": "2025-08-12T16:22:13.694Z",                 //  HAVE
    "object1": 248,                                          //  HAVE
    "object2": 252,                                          //  HAVE
    "timeToClosestApproach": 141.1330593243123,              //  HAVE
    
    // DISTANCE METRICS
    "minDistance": 4.347235714757981,                        //  HAVE (km)
    "minDistance_m": 4347.236,                               //  NEED TO ADD (minDistance × 1000)
    
    // VELOCITY METRICS  
    "relativeVelocity": 9.88487032964921,                    //  HAVE (km/s)
    "relativeVelocity_ms": 9884.870,                         //  NEED TO ADD (relativeVelocity × 1000
    
    // PROBABILITY & RISK
    "probability": 0.5652764285242019,                       //  HAVE
    "risk_level": "CRITICAL",                                //  NEED TO ADD (based on probability)
    "recommended_action": "EMERGENCY_MANEUVER",              //  NEED TO ADD (based on risk_level)
    
    // OBJECT 1 METADATA
    "object1_name": "STARLINK-2847",                         //  NEED TO ADD
    "object1_norad_id": 48247,                               //  NEED TO ADD (if mapping to real catalog)
    "object1_type": "PAYLOAD",                               //  NEED TO ADD (PAYLOAD/DEBRIS/ROCKET_BODY)
    "object1_size_m": 3.2,                                   //  NEED TO ADD (object radius)
    
    // OBJECT 2 METADATA
    "object2_name": "COSMOS-2251-DEB",                       //  NEED TO ADD
    "object2_norad_id": 34423,                               //  NEED TO ADD (if mapping to real catalog)
    "object2_type": "DEBRIS",                                //  NEED TO ADD (PAYLOAD/DEBRIS/ROCKET_BODY)
    "object2_size_m": 0.5,                                   //  NEED TO ADD (object radius)
    
    // POSITION VECTORS (ECI Coordinates in km)
    "position1": {                                           //  HAVE
      "x": -6507.24609375,                                   //  HAVE
      "y": -2262.26611328125,                                //  HAVE
      "z": 561.0975952148438                                 //  HAVE
    },
    "position2": {                                           //  HAVE
      "x": -6836.2060546875,                                  //  HAVE
      "y": -907.4765014648438,                                //  HAVE
      "z": 510.076904296875                                   //  HAVE
    },
    
    // VELOCITY VECTORS (km/s)
    "velocity1": {                                           //  NEED TO ADD (you compute this already!)
      "vx": 2.847,                                           //  NEED TO ADD
      "vy": -6.923,                                          //  NEED TO ADD
      "vz": 1.244                                            //  NEED TO ADD
    },
    "velocity2": {                                           //  NEED TO ADD (you compute this already!)
      "vx": 3.112,                                           //  NEED TO ADD
      "vy": -6.801,                                          //  NEED TO ADD
      "vz": 1.189                                            //  NEED TO ADD
    },
    
    // SCREENING & ANALYSIS PARAMETERS
    "combined_size_m": 3.7,                                  //  NEED TO ADD (obj1_size + obj2_size)
    "miss_distance_body_radii": 1.18,                        //  NEED TO ADD (minDistance_m / combined_size)
    "screening_volume_m": 1000.0,                            //  NEED TO ADD (your detection threshold)
    
    // DATA QUALITY METRICS
    "position_uncertainty_m": 50.0,                          //  NEED TO ADD (can start with fixed value)
    "data_age_hours": 0.5,                                   //  NEED TO ADD (time since TLE/state update)
    "computation_method": "N-BODY_PHYSICS",                  //  NEED TO ADD (vs SGP4/TLE)
    
    "status": "active"                                       //  HAVE
  },
  "metadata": {                                              //  HAVE (can keep as-is for now)
    "id": "conj_1755015733694_zj246vew8",
    "timestamp": "2025-08-12T16:22:13.694Z",
    "object1": 248,
    "object2": 252,
    "minDistance": 4.347235714757981,
    "relativeVelocity": 9.88487032964921,
    "timeToClosestApproach": 141.1330593243123,
    "status": "active"
  }
}