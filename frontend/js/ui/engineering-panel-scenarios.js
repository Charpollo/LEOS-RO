/**
 * Engineering Panel Scenarios Module
 * Handles scenario presets and descriptions
 * Following flight-rules: Modular components under 1000 lines
 */

export const scenarioDetails = {
    'Collision Demo': {
        description: 'Intentional collision scenario for Kessler cascade visualization',
        details: [
            '15,000 satellites in crossing orbits',
            'Polar vs Equatorial orbital planes',
            'Altitude: 550-570km (tight band)',
            'Designed for high collision probability'
        ],
        risks: 'DEMO',
        riskColor: '#ff00ff',
        highlights: ['Visual demonstration', 'Cascading collisions', 'Real-time debris generation']
    }
};

export const scenarioPresets = [
    { name: 'Collision Demo', satellites: 15000, debris: 0 }
];