/**
 * Template Manager for loading and populating HTML templates
 */
class TemplateManager {
    constructor() {
        this.templates = new Map();
        this.initialized = false;
    }

    /**
     * Initialize the template manager by loading all templates
     */
    async initialize() {
        if (this.initialized) return;

        try {
            const response = await fetch('/templates/telemetry.html');
            const html = await response.text();
            
            // Create a temporary container to parse the HTML
            const container = document.createElement('div');
            container.innerHTML = html;
            
            // Store all templates
            container.querySelectorAll('template').forEach(template => {
                this.templates.set(template.id, template);
            });

            this.initialized = true;
        } catch (error) {
            console.error('Failed to load templates:', error);
        }
    }

    /**
     * Get a template by ID and optionally populate it with data
     * @param {string} templateId - The ID of the template to retrieve
     * @param {Object} data - Optional data to populate the template with
     * @returns {DocumentFragment} The populated template content
     */
    getTemplate(templateId, data = null) {
        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error(`Template "${templateId}" not found`);
        }

        // Clone the template content
        const content = template.content.cloneNode(true);

        // If data is provided, populate the template
        if (data) {
            this.populateTemplate(content, data);
        }

        return content;
    }

    /**
     * Populate template elements with data
     * @param {DocumentFragment} template - The template to populate
     * @param {Object} data - The data to populate the template with
     */
    populateTemplate(template, data) {
        // Handle telemetry-item elements
        template.querySelectorAll('telemetry-item').forEach(item => {
            const label = item.getAttribute('label');
            if (data[label]) {
                item.setAttribute('value', this.formatValue(data[label]));
            }
        });

        // Handle mission clock
        const clock = template.querySelector('#mission-clock');
        if (clock && data.time) {
            clock.textContent = `${data.time} UTC`;
        }

        // Handle canvas setup for graphs
        const canvas = template.querySelector('#telemetry-canvas');
        if (canvas && data.graphData) {
            this.setupGraph(canvas, data.graphData);
        }
    }

    /**
     * Format a value for display
     * @param {number|string} value - The value to format
     * @returns {string} The formatted value
     */
    formatValue(value) {
        if (typeof value === 'number') {
            // Format numbers to appropriate precision
            return value < 1 ? value.toFixed(6) : value.toFixed(3);
        }
        return value.toString();
    }

    /**
     * Set up a telemetry graph on a canvas
     * @param {HTMLCanvasElement} canvas - The canvas element
     * @param {Object} data - The graph data
     */
    setupGraph(canvas, data) {
        // Graph setup code would go here
        // This would use your preferred graphing library
    }
}

// Export a singleton instance
export const templateManager = new TemplateManager();

/**
 * Create a telemetry item HTML string
 * @param {string} label - The label for the telemetry item
 * @param {number|string} value - The value of the telemetry item
 * @returns {string} The HTML string for the telemetry item
 */
export function createTelemetryItem(label, value) {
    return `<div class="telemetry-item">
        <span class="telemetry-label">${label}:</span>
        <span class="telemetry-value">${value}</span>
    </div>`;
}

/**
 * Format a system name by capitalizing words
 * @param {string} name - The system name to format
 * @returns {string} The formatted system name
 */
export function formatSystemName(name) {
    return name.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
