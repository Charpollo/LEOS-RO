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
    initWelcomeModal();
    initLearningModal();
    // initTimeDisplay();    // Disabled in favor of simulation-driven clock
    initTelemetryDashboard();
    initSdaButton();
    initModalManager();
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

// Learning modal functionality
function initLearningModal() {
    const learningModal = document.getElementById('learning-modal');
    const closeBtn = document.getElementById('learning-modal-close');
    const okBtn = document.getElementById('learning-modal-ok');
    
    if (learningModal) {
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                learningModal.style.display = 'none';
            });
        }
        
        if (okBtn) {
            okBtn.addEventListener('click', () => {
                learningModal.style.display = 'none';
            });
        }
        
        // Close on outside click
        learningModal.addEventListener('click', (e) => {
            if (e.target === learningModal) {
                learningModal.style.display = 'none';
            }
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
            
            // Show welcome modal automatically after loading (with delay for smooth UX)
            setTimeout(() => {
                const welcomeModal = document.getElementById('welcome-modal');
                console.log('[LEOS] Welcome modal found:', !!welcomeModal);
                
                if (welcomeModal) {
                    // Show the combined welcome modal
                    welcomeModal.style.display = 'flex';
                    
                    console.log('[LEOS] Welcome modal shown automatically');
                } else {
                    console.error('[LEOS] Welcome modal not found!');
                }
            }, 1000); // 1 second delay after loading screen disappears
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


// Show control buttons after scene loads
export function showHelpButton() {
    const helpBtn = document.getElementById('help-sphere-btn');
    if (helpBtn) {
        helpBtn.style.display = 'flex';
        // Set up help button to show welcome modal
        helpBtn.addEventListener('click', () => {
            const welcomeModal = document.getElementById('welcome-modal');
            if (welcomeModal) {
                welcomeModal.style.display = 'flex';
            }
        });
    }
    
    // Show Learning button
    const learningBtn = document.getElementById('learning-btn');
    if (learningBtn) {
        learningBtn.style.display = 'flex';
        // Set up learning button to show learning modal
        learningBtn.addEventListener('click', () => {
            const learningModal = document.getElementById('learning-modal');
            if (learningModal) {
                learningModal.style.display = 'flex';
            }
        });
    }
    
    // Show SDA toggle button now that the simulation is loaded
    const sdaToggleBtn = document.getElementById('sda-toggle-btn');
    if (sdaToggleBtn) {
        sdaToggleBtn.style.display = 'block';
    }
    
    // Show simulation settings button now that the simulation is loaded
    const simulationSettingsBtn = document.getElementById('simulation-settings-btn');
    if (simulationSettingsBtn) {
        simulationSettingsBtn.style.display = 'flex';
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

// Modal management system to ensure only one modal is open at a time
function initModalManager() {
    // Define all modal IDs and their toggle methods
    const modals = {
        'sda-welcome-modal': {
            element: null,
            toggleClass: null,
            closeMethod: 'display'
        },
        'simulation-settings-modal': {
            element: null,
            toggleClass: null,
            closeMethod: 'display'
        },
        'welcome-modal': {
            element: null,
            toggleClass: null,
            closeMethod: 'display'
        },
        'learning-modal': {
            element: null,
            toggleClass: null,
            closeMethod: 'display'
        }
    };

    // Get references to modal elements
    Object.keys(modals).forEach(modalId => {
        modals[modalId].element = document.getElementById(modalId);
    });

    // Function to close all modals
    window.closeAllModals = function() {
        Object.keys(modals).forEach(modalId => {
            const modal = modals[modalId];
            if (modal.element) {
                if (modal.closeMethod === 'removeClass' && modal.toggleClass) {
                    modal.element.classList.remove(modal.toggleClass);
                } else if (modal.closeMethod === 'display') {
                    modal.element.style.display = 'none';
                }
            }
        });
    };

    // Function to open a specific modal (closes others first)
    window.openModal = function(modalId) {
        // Close all other modals first
        window.closeAllModals();
        
        // Open the requested modal
        const modal = modals[modalId];
        if (modal && modal.element) {
            if (modal.closeMethod === 'removeClass' && modal.toggleClass) {
                modal.element.classList.add(modal.toggleClass);
            } else if (modal.closeMethod === 'display') {
                modal.element.style.display = 'flex';
            }
        }
    };


    // Settings modal override
    const settingsBtn = document.getElementById('simulation-settings-btn');
    if (settingsBtn) {
        // Remove existing listeners by cloning
        const newSettingsBtn = settingsBtn.cloneNode(true);
        settingsBtn.parentNode.replaceChild(newSettingsBtn, settingsBtn);
        
        newSettingsBtn.addEventListener('click', () => {
            const settingsModal = document.getElementById('simulation-settings-modal');
            if (settingsModal && settingsModal.style.display === 'flex') {
                window.closeAllModals();
            } else {
                window.openModal('simulation-settings-modal');
                // Call the original settings modal function to populate data
                if (window.showSimulationSettingsModal) {
                    window.showSimulationSettingsModal();
                }
            }
        });
    }
}