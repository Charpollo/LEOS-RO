/**
 * Engineering Panel Scenarios Module
 * Handles scenario presets and descriptions
 * Following flight-rules: Modular components under 1000 lines
 */

export const scenarioDetails = {
    'Current (2025)': {
        description: 'Real-time snapshot of current orbital environment',
        details: [
            'Active satellites: ~11,500 operational',
            'Tracked debris: 34,000+ objects >10cm',
            'Orbital density: Manageable with avoidance',
            'Key orbits: LEO congested, MEO/GEO stable'
        ],
        risks: 'Low-Medium',
        riskColor: '#ffff00',
        highlights: ['SpaceX Starlink: ~5,000 sats', 'OneWeb: ~600 sats', 'ISS operations normal']
    },
    'Projected 2035': {
        description: 'Conservative 10-year projection based on current launch rates',
        details: [
            'Expected satellites: 58,000-100,000',
            'Debris growth: 5x current (170,000+ objects)',
            'New constellations: Multiple mega-constellations',
            'Launch rate: 2,000+ satellites/year'
        ],
        risks: 'High',
        riskColor: '#ff6600',
        highlights: ['Starlink complete: 42,000', 'Chinese GuoWang: 13,000', 'Amazon Kuiper: 3,200']
    },
    'Kessler Syndrome': {
        description: 'Catastrophic cascade collision scenario - LEO becomes unusable',
        details: [
            'Trigger: Major collision at 800-900km',
            'Cascade rate: Exponential debris growth',
            'Timeline: Full cascade in 5-10 years',
            'Recovery: 50-100 years minimum'
        ],
        risks: 'CRITICAL',
        riskColor: '#ff0000',
        highlights: ['No new launches possible', 'Loss of all LEO services', 'GPS/comms failure']
    },
    'Starlink Full': {
        description: 'Complete SpaceX Starlink constellation deployment',
        details: [
            'Total satellites: 42,000 approved',
            'Orbital shells: 5 distinct altitudes',
            'Coverage: Global broadband <25ms latency',
            'Collision avoidance: Autonomous AI'
        ],
        risks: 'Medium',
        riskColor: '#ffff00',
        highlights: ['550km shell: 1,584 sats', '540km shell: 1,584 sats', '570km shell: 720 sats']
    },
    'Chinese Mega': {
        description: 'Chinese GuoWang mega-constellation scenario',
        details: [
            'Total satellites: 13,000 planned',
            'Deployment: 2028-2035 timeline',
            'Purpose: Broadband + surveillance',
            'Orbits: 500-1,145km altitude range'
        ],
        risks: 'Medium-High',
        riskColor: '#ff6600',
        highlights: ['State-controlled network', 'Dual-use capabilities', 'Orbital slot competition']
    },
    'Military Surge': {
        description: 'Rapid military satellite deployment for conflict scenario',
        details: [
            'Tactical satellites: 5,000+ in 6 months',
            'Purpose: C3ISR enhancement',
            'Orbits: Mixed LEO/MEO for coverage',
            'Lifetime: 2-5 years expendable'
        ],
        risks: 'High',
        riskColor: '#ff0000',
        highlights: ['Proliferated LEO', 'Resilient architecture', 'Anti-jam comms']
    },
    'ASAT Test': {
        description: 'Simulation of anti-satellite weapon test creating massive debris',
        details: [
            'Target altitude: 850km (worst case)',
            'Debris created: 3,000+ trackable pieces',
            'Micro-debris: 1M+ particles <10cm',
            'Orbit persistence: 20-100 years'
        ],
        risks: 'EXTREME',
        riskColor: '#ff0000',
        highlights: ['Based on 2007 Chinese test', 'Fengyun-1C destruction', 'Still tracking debris today']
    },
    'Kessler Cascade': {
        description: 'Active Kessler syndrome with ongoing cascade collisions',
        details: [
            'Initial trigger: 10+ major collisions',
            'Cascade level: Self-sustaining',
            'Debris field: Expanding rapidly',
            'Safe orbits: None below 2000km'
        ],
        risks: 'CATASTROPHIC',
        riskColor: '#ff0000',
        highlights: ['Space access denied', 'Civilization impact', 'No mitigation possible']
    }
};

export const scenarioPresets = [
    { name: 'Current (2025)', satellites: 9500, debris: 34000 },
    { name: 'Projected 2035', satellites: 100000, debris: 500000 },
    { name: 'Kessler Syndrome', satellites: 5000, debris: 2000000 },
    { name: 'Starlink Full', satellites: 42000, debris: 0 },
    { name: 'Chinese Mega', satellites: 55000, debris: 100000 },
    { name: 'Military Surge', satellites: 15000, debris: 50000 },
    { name: 'ASAT Test', satellites: 9500, debris: 3000000 },
    { name: 'Kessler Cascade', satellites: 1000, debris: 8000000 }
];