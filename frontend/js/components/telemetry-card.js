class TelemetryCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() {
        return ['title', 'classification', 'data-quality'];
    }

    async connectedCallback() {
        // Load external stylesheet
        const linkElem = document.createElement('link');
        linkElem.setAttribute('rel', 'stylesheet');
        linkElem.setAttribute('href', '/css/components.css');
        this.shadowRoot.appendChild(linkElem);
        
        await this.render();
        this.render();
    }

    attributeChangedCallback() {
        this.render();
    }

    async render() {
        const title = this.getAttribute('title') || '';
        const classification = this.getAttribute('classification') || '';
        const dataQuality = this.getAttribute('data-quality') || '';

        const template = document.createElement('div');
        template.innerHTML = `
            <div class="card-header">
                <h4>${title}</h4>
                ${classification ? `<div class="classification">${classification}</div>` : ''}
                ${dataQuality ? `
                    <div class="data-quality">
                        <div class="quality-indicator"></div>
                        <span>${dataQuality}</span>
                    </div>
                ` : ''}
            </div>
            <div class="telemetry-grid">
                <slot></slot>
            </div>
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

customElements.define('telemetry-card', TelemetryCard);
