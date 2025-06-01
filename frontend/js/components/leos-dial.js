// LEOS Dial UI Component (Frame)
// This is the initial frame for the top-left control dial, with placeholders for button panel and tab content.

export class LeosDial {
    constructor(containerSelector = 'body') {
        this.container = document.querySelector(containerSelector);
        this.createDial();
    }

    createDial() {
        // Main dial wrapper
        this.dialWrapper = document.createElement('div');
        this.dialWrapper.className = 'leos-dial-wrapper';
        this.dialWrapper.innerHTML = `
            <div class="leos-dial-glow"></div>
            <div class="leos-dial-circle">
                <div class="leos-dial-icon"></div>
            </div>
            <div class="leos-dial-panel" style="display:none;">
                <button class="leos-dial-btn" data-action="clouds">
                    <span class="leos-dial-btn-icon clouds"></span>
                    <span class="leos-dial-btn-label">Clouds</span>
                </button>
                <button class="leos-dial-btn" data-action="grid">
                    <span class="leos-dial-btn-icon grid"></span>
                    <span class="leos-dial-btn-label">Grid</span>
                </button>
                <button class="leos-dial-btn" data-action="moon">
                    <span class="leos-dial-btn-icon moon"></span>
                    <span class="leos-dial-btn-label">Moon</span>
                </button>
                <button class="leos-dial-btn" data-action="info">
                    <span class="leos-dial-btn-icon info"></span>
                    <span class="leos-dial-btn-label">Info</span>
                </button>
            </div>
        `;
        this.container.appendChild(this.dialWrapper);

        // Add event listeners for dial open/close
        this.dialCircle = this.dialWrapper.querySelector('.leos-dial-circle');
        this.dialPanel = this.dialWrapper.querySelector('.leos-dial-panel');
        this.dialCircle.addEventListener('click', () => this.togglePanel());

        // Button logic
        this.dialPanel.querySelectorAll('.leos-dial-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.getAttribute('data-action');
                this.handleButton(action);
            });
        });
    }

    togglePanel() {
        const isOpen = this.dialPanel.style.display === 'flex';
        this.dialPanel.style.display = isOpen ? 'none' : 'flex';
        this.dialPanel.style.flexDirection = 'column';
    }

    handleButton(action) {
        // Placeholder: Replace with real simulation control logic
        window.dispatchEvent(new CustomEvent('leos-dial-action', { detail: { action } }));
    }
}

// To use: import and instantiate LeosDial in your main JS entry point.
