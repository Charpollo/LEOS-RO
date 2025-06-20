// Space facts for loading screen
const spaceFacts = [
    "Did you know? There are over 34,000 objects larger than 10cm currently orbiting Earth.",
    "The International Space Station travels at approximately 28,000 km/h around Earth.",
    "Low Earth Orbit extends from about 160km to 2,000km above Earth's surface.",
    "Satellites in geostationary orbit complete one revolution in exactly 24 hours.",
    "The first artificial satellite, Sputnik 1, was launched on October 4, 1957.",
    "Space debris is tracked by global surveillance networks to prevent collisions.",
    "The Kessler Syndrome describes a cascade effect of space debris collisions.",
    "CubeSats are standardized miniature satellites used for space research."
];

// Initialize brand UI components
export function initBrandUI() {
    // Set random space fact
    const spaceFactElement = document.getElementById('space-fact');
    if (spaceFactElement) {
        const randomFact = spaceFacts[Math.floor(Math.random() * spaceFacts.length)];
        spaceFactElement.querySelector('p').textContent = randomFact;
    }
    // Initialize loading wave animation
    initLoadingWave();
    initPanelToggle();
    initWelcomeModal();
    initInfoPanel();
    // initTimeDisplay();    // Disabled in favor of simulation-driven clock
    initTelemetryDashboard();
    initHelpModal();
    initSdaButton();
}

/**
 * Placeholder for SDA button initialization
 * The actual event binding happens in hideLoadingScreen
 */
function initSdaButton() {
    // Event binding moved to hideLoadingScreen for proper localStorage check
    // This prevents duplicate event listeners
}

/**
 * [DEPRECATED] - SDA toggle functionality now handled in app.js
 * This function is kept for reference but should not be called
 */
function initSDAToggle() {
    // SDA toggle functionality has been moved to app.js
    // to prevent duplicate event listeners
    console.warn('initSDAToggle is deprecated. SDA toggle functionality is now handled in app.js');
}

// Panel toggle functionality
function initPanelToggle() {
    const panelToggle = document.getElementById('panel-toggle');
    const infoPanel = document.getElementById('info-panel');
    
    if (panelToggle && infoPanel) {
        panelToggle.addEventListener('click', () => {
            const isVisible = infoPanel.classList.contains('visible');
            
            if (isVisible) {
                infoPanel.classList.remove('visible');
                panelToggle.classList.remove('active');
            } else {
                infoPanel.classList.add('visible');
                panelToggle.classList.add('active');
            }
        });
    }
}

// Welcome modal functionality
function initWelcomeModal() {
    const gotItBtn = document.getElementById('got-it-btn');
    const welcomeModal = document.getElementById('welcome-modal');
    
    if (gotItBtn && welcomeModal) {
        gotItBtn.addEventListener('click', () => {
            welcomeModal.style.display = 'none';
            sessionStorage.setItem('welcomeModalShown', 'true');
        });
    }
}

// Info panel functionality
function initInfoPanel() {
    const closePanel = document.getElementById('close-panel');
    const showTutorial = document.getElementById('show-tutorial');
    const infoPanel = document.getElementById('info-panel');
    const welcomeModal = document.getElementById('welcome-modal');
    const panelToggle = document.getElementById('panel-toggle');
    
    if (closePanel && infoPanel && panelToggle) {
        closePanel.addEventListener('click', () => {
            infoPanel.classList.remove('visible');
            panelToggle.classList.remove('active');
        });
    }
    
    if (showTutorial && welcomeModal) {
        showTutorial.addEventListener('click', () => {
            welcomeModal.style.display = 'flex';
        });
    }
}

// Import UIManager
import { uiManager } from './manager.js';

// Global event delegation for close-dashboard and Escape key
// This ensures the listeners are always active, even if dashboard is re-rendered

document.addEventListener('click', (e) => {
    if (e.target.matches('.close-dashboard')) {
        uiManager.hideAdvancedTelemetry();
    }
});
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
        uiManager.hideAdvancedTelemetry();
    }
});

// Listen for close button on the mission dashboard
// and for Escape key to close the mission dashboard overlay

document.addEventListener('click', (e) => {
    if (e.target.matches('.close-mission-dashboard')) {
        const dash = document.getElementById('mission-dashboard');
        if (dash) {
            // Add a fade-out effect
            dash.style.transition = 'opacity 0.4s ease-in-out';
            dash.style.opacity = '0';
            
            // Wait for the fade animation to complete before hiding
            setTimeout(() => {
                dash.classList.replace('visible', 'hidden');
                // Reset opacity for next time
                dash.style.opacity = '';
            }, 400); // Match transition duration
            
            // Dispatch event to reset camera - do this immediately for responsive feel
            window.dispatchEvent(new CustomEvent('missionDashboardClosed'));
        }
    }
});

window.addEventListener('keydown', (e) => {
    if ((e.key === 'Escape' || e.key === 'Esc')) {
        const dash = document.getElementById('mission-dashboard');
        if (dash && dash.classList.contains('visible')) {
            // Add a fade-out effect
            dash.style.transition = 'opacity 0.4s ease-in-out';
            dash.style.opacity = '0';
            
            // Wait for the fade animation to complete before hiding
            setTimeout(() => {
                dash.classList.replace('visible', 'hidden');
                // Reset opacity for next time
                dash.style.opacity = '';
            }, 400); // Match transition duration
            
            // Dispatch event to reset camera - do this immediately for responsive feel
            window.dispatchEvent(new CustomEvent('missionDashboardClosed'));
        }
    }
});

// Telemetry dashboard functionality
function initTelemetryDashboard() {
    // No-op: logic moved to top-level for reliability
}

// Show/hide loading screen
export function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        loadingScreen.style.transition = 'opacity 0.5s ease-out';
        
        setTimeout(() => {
            // Fully hide loading screen
            loadingScreen.style.display = 'none';
            // Clean up aurora background when loading screen is hidden
            import('../aurora-background.js').then(module => {
                if (module.cleanupAuroraBackground) {
                    module.cleanupAuroraBackground();
                }
            }).catch(() => {});
            // Now show SDA toggle button once loading is cleared
            const sdaBtn = document.getElementById('sda-toggle-btn');
            if (sdaBtn) {
                sdaBtn.style.display = 'flex';
                // NOTE: Primary SDA toggle functionality is now handled in app.js
                // This handler is removed to prevent duplicate event listeners
                // No event listener is added here anymore
             }
         }, 500);
    }
}

// Show welcome modal
export function showWelcomeModal() {
    const welcomeModalShown = sessionStorage.getItem('welcomeModalShown') === 'true';
    const welcomeModal = document.getElementById('welcome-modal');
    
    if (!welcomeModalShown && welcomeModal) {
        setTimeout(() => {
            welcomeModal.style.display = 'flex';
        }, 1000);
    }
}

// Make the ground station dashboard draggable
function makeDraggable(el) {
    let isDown = false;
    let offsetX = 0;
    let offsetY = 0;
    el.style.cursor = 'move';
    el.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('close-dashboard')) return;
        isDown = true;
        const rect = el.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        el.style.left = e.clientX - offsetX + 'px';
        el.style.top = e.clientY - offsetY + 'px';
        el.style.transform = 'none';
    });
    document.addEventListener('mouseup', () => { isDown = false; });
}

// Initialize draggable behavior once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    const dash = document.getElementById('ground-dashboard');
    if (dash) {
        makeDraggable(dash);
    }
});

// Help modal toggle and keyboard shortcut (Q key)
function initHelpModal() {
    const helpBtn = document.getElementById('help-sphere-btn');
    const helpModal = document.getElementById('help-modal');
    const helpClose = document.getElementById('help-close-btn');
    if (helpBtn && helpModal) {
        // Don't show help button initially - only after scene loads
        helpBtn.style.display = 'none';
        // Open modal helper function (no toggle, just open)
        const openHelp = () => helpModal.classList.add('open');
        // Open modal on click (simpler approach)
        helpBtn.addEventListener('click', openHelp);
        // Close modal on close button click
        if (helpClose) {
            helpClose.addEventListener('click', () => {
                helpModal.classList.remove('open');
            });
        }
        // Toggle modal on 'q' key press
        window.addEventListener('keydown', (e) => {
            if (e.key === 'q' || e.key === 'Q') {
                helpModal.classList.toggle('open');
            }
        });
    }
}

// Show help button after scene loads
export function showHelpButton() {
    const helpBtn = document.getElementById('help-sphere-btn');
    if (helpBtn) {
        helpBtn.style.display = 'flex';
    }
    
    // Show SDA toggle button now that the simulation is loaded
    const sdaToggleBtn = document.getElementById('sda-toggle-btn');
    if (sdaToggleBtn) {
        sdaToggleBtn.style.display = 'block';
    }
    
    // Don't show Add TLE button initially - only when SDA is active
}

// Initialize loading wave animation by splitting text into spans
function initLoadingWave() {
    const target = document.getElementById('loadingWave');
    if (target) {
        const text = target.textContent;
        target.innerHTML = '';
        for (let character of text) {
            const span = document.createElement('span');
            if (character === ' ') {
                span.innerHTML = '&nbsp;';
            } else {
                span.textContent = character;
            }
            target.appendChild(span);
        }
    }
}