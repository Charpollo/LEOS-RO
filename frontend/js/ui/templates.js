// Template functions for generating dynamic UI content

export const templates = {
    /**
     * Generate telemetry dashboard HTML
     * @param {Object} telemetry - Telemetry data object
     * @returns {string} HTML string
     */
    telemetryDashboard(telemetry) {
        return `
            <div class="dashboard-header">
                <h2>Advanced Telemetry</h2>
                <div class="mission-time">
                    <span id="mission-clock">${new Date().toISOString().split('T')[1].split('.')[0]} UTC</span>
                </div>
                <button class="close-dashboard">&times;</button>
            </div>
            <div class="dashboard-content">
                ${this.orbitalCard(telemetry)}
                ${this.positionCard(telemetry)}
                ${this.velocityCard(telemetry)}
                ${telemetry.missionParameters ? this.missionCard(telemetry.missionParameters) : ''}
                ${this.telemetryGraph()}
            </div>
        `;
    },

    /**
     * Generate orbital elements card
     * @param {Object} telemetry - Telemetry data
     * @returns {string} HTML string
     */
    orbitalCard(telemetry) {
        return `
            <telemetry-card 
                title="Orbital Elements"
                data-quality="REAL-TIME">
                <telemetry-item
                    label="Semi-Major Axis"
                    value="${telemetry.semiMajorAxis.toFixed(2)}"
                    unit="KM">
                </telemetry-item>
                <telemetry-item
                    label="Eccentricity"
                    value="${telemetry.eccentricity.toFixed(6)}"
                    unit="-">
                </telemetry-item>
                <telemetry-item
                    label="Inclination"
                    value="${telemetry.inclination.toFixed(3)}"
                    unit="DEG">
                </telemetry-item>
                <telemetry-item
                    label="RAAN"
                    value="${telemetry.raan.toFixed(3)}"
                    unit="DEG">
                </telemetry-item>
                <telemetry-item
                    label="Argument of Perigee"
                    value="${telemetry.argOfPerigee.toFixed(3)}"
                    unit="DEG">
                </telemetry-item>
                <telemetry-item
                    label="Mean Anomaly"
                    value="${telemetry.meanAnomaly.toFixed(3)}"
                    unit="DEG">
                </telemetry-item>
            </telemetry-card>
        `;
    },

    /**
     * Generate position card
     * @param {Object} telemetry - Telemetry data
     * @returns {string} HTML string
     */
    positionCard(telemetry) {
        return `
            <telemetry-card 
                title="Position & Attitude"
                classification="ECI J2000">
                <telemetry-item
                    label="X Position"
                    value="${telemetry.position.x.toFixed(3)}"
                    unit="KM">
                </telemetry-item>
                <telemetry-item
                    label="Y Position"
                    value="${telemetry.position.y.toFixed(3)}"
                    unit="KM">
                </telemetry-item>
                <telemetry-item
                    label="Z Position"
                    value="${telemetry.position.z.toFixed(3)}"
                    unit="KM">
                </telemetry-item>
                <telemetry-item
                    label="Altitude"
                    value="${telemetry.altitude.toFixed(3)}"
                    unit="KM"
                    highlight>
                </telemetry-item>
            </telemetry-card>
        `;
    },

    /**
     * Generate velocity card
     * @param {Object} telemetry - Telemetry data
     * @returns {string} HTML string
     */
    velocityCard(telemetry) {
        return `
            <telemetry-card 
                title="Velocity & Dynamics"
                classification="Earth Fixed">
                <telemetry-item
                    label="X Velocity"
                    value="${telemetry.velocity.x.toFixed(4)}"
                    unit="KM/S">
                </telemetry-item>
                <telemetry-item
                    label="Y Velocity"
                    value="${telemetry.velocity.y.toFixed(4)}"
                    unit="KM/S">
                </telemetry-item>
                <telemetry-item
                    label="Z Velocity"
                    value="${telemetry.velocity.z.toFixed(4)}"
                    unit="KM/S">
                </telemetry-item>
                <telemetry-item
                    label="Orbital Speed"
                    value="${telemetry.speed.toFixed(4)}"
                    unit="KM/S"
                    highlight>
                </telemetry-item>
            </telemetry-card>
        `;
    },

    /**
     * Generate mission parameters card
     * @param {Object} missionParams - Mission parameters
     * @returns {string} HTML string
     */
    missionCard(missionParams) {
        return `
            <telemetry-card 
                title="Mission Parameters"
                classification="OPERATIONAL">
                <telemetry-item
                    label="Launch Date"
                    value="${missionParams.launchDate}"
                    unit="UTC">
                </telemetry-item>
                <telemetry-item
                    label="Mission Duration"
                    value="${missionParams.duration}"
                    unit="DAYS">
                </telemetry-item>
                <telemetry-item
                    label="Operational Status"
                    value="${missionParams.status}"
                    unit="-">
                </telemetry-item>
                <telemetry-item
                    label="Communication"
                    value="ACTIVE"
                    unit="-">
                </telemetry-item>
            </telemetry-card>
        `;
    },

    /**
     * Generate telemetry graph placeholder
     * @returns {string} HTML string
     */
    telemetryGraph() {
        return `
            <telemetry-card title="Telemetry Trends">
                <div class="graph-controls">
                    <button class="graph-btn active" data-param="altitude">ALT</button>
                    <button class="graph-btn" data-param="speed">SPD</button>
                    <button class="graph-btn" data-param="position">POS</button>
                </div>
                <div class="telemetry-graph">
                    <canvas id="telemetry-canvas" width="400" height="150"></canvas>
                    <div class="graph-placeholder">Real-time telemetry visualization</div>
                </div>
            </telemetry-card>
        `;
    }
};
