class TelemetryItem extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() {
        return ['label', 'value', 'unit', 'highlight'];
    }

    async connectedCallback() {
        // Load external stylesheet
        const linkElem = document.createElement('link');
        linkElem.setAttribute('rel', 'stylesheet');
        linkElem.setAttribute('href', '/css/components.css');
        this.shadowRoot.appendChild(linkElem);
        
        await this.render();
    }

    attributeChangedCallback() {
        this.render();
    }

    async render() {
        const label = this.getAttribute('label') || '';
        const value = this.getAttribute('value') || '';
        const unit = this.getAttribute('unit') || '';
        const highlight = this.hasAttribute('highlight');

        const template = document.createElement('div');
        template.className = 'telemetry-item';
        if (highlight) {
            template.classList.add('highlight');
        }

        template.innerHTML = `
            <span class="telemetry-label">${label}</span>
            <span class="telemetry-value">${value}</span>
            <span class="telemetry-unit">${unit}</span>
        `;

        // Clear existing content except stylesheet
        const stylesheet = this.shadowRoot.querySelector('link');
        this.shadowRoot.innerHTML = '';
        if (stylesheet) {
            this.shadowRoot.appendChild(stylesheet);
        }
        this.shadowRoot.appendChild(template);
    }
}

customElements.define('telemetry-item', TelemetryItem);
