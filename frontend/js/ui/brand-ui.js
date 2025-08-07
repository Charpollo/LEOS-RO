// Disaster and debris facts for loading screen
const spaceFacts = [
    "Warning: Over 130 million pieces of debris smaller than 1cm are orbiting Earth at lethal speeds.",
    "A 1cm paint fleck traveling at orbital velocity has the kinetic energy of a hand grenade.",
    "The 2009 Iridium-Cosmos collision created over 2,000 trackable debris fragments.",
    "Kessler Syndrome could make space inaccessible for generations if triggered.",
    "China's 2007 anti-satellite test created 3,500+ pieces of trackable debris.",
    "Even a 1mm aluminum sphere can penetrate ISS crew modules at orbital velocity.",
    "The ESA estimates a 1 in 10,000 chance of catastrophic collision for active satellites.",
    "At 17,500 mph, even tiny debris becomes a hypervelocity projectile."
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
    // Modals removed - functionality in SDA
    // initTimeDisplay();    // Disabled in favor of simulation-driven clock
    initTelemetryDashboard();
    initSdaButton();
    initRedOrbitSDA(); // Red Orbit integrated into SDA
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
function initRedOrbitModal() {
    const redOrbitModal = document.getElementById('red-orbit-modal');
    const closeBtn = document.getElementById('red-orbit-modal-close');
    const activateBtn = document.getElementById('activate-scenario');
    
    if (redOrbitModal) {
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                redOrbitModal.style.display = 'none';
                stopCollisionCountdown();
            });
        }
        
        if (activateBtn) {
            activateBtn.addEventListener('click', () => {
                activateCollisionScenario();
                activateBtn.textContent = 'SCENARIO ACTIVE';
                activateBtn.disabled = true;
            });
        }
        
        // Close on outside click
        redOrbitModal.addEventListener('click', (e) => {
            if (e.target === redOrbitModal) {
                redOrbitModal.style.display = 'none';
                stopCollisionCountdown();
            }
        });
    }
}

// Support modal functionality
function initSupportModal() {
    const supportModal = document.getElementById('support-modal');
    const closeBtn = document.getElementById('support-modal-close');
    const form = document.getElementById('support-form');
    
    if (supportModal) {
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                supportModal.style.display = 'none';
            });
        }
        
        // Close on outside click
        supportModal.addEventListener('click', (e) => {
            if (e.target === supportModal) {
                supportModal.style.display = 'none';
            }
        });
        
        // Handle form submission
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const formData = new FormData(form);
                
                // Add browser info automatically if not provided
                const browserInfo = document.getElementById('browser-info');
                if (browserInfo && !browserInfo.value.trim()) {
                    const userAgent = navigator.userAgent;
                    const screenInfo = `Screen: ${screen.width}x${screen.height}`;
                    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                    browserInfo.value = `User Agent: ${userAgent}\n${screenInfo}\nTimezone: ${timeZone}`;
                    formData.set('browser-info', browserInfo.value);
                }
                
                // Submit to Netlify
                fetch('/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams(formData).toString()
                })
                .then(() => {
                    // Success - show animated confirmation
                    showSuccessNotification('Thank you for your message! We\'ll get back to you within 24-48 hours.');
                    form.reset();
                    
                    // Close modal after a short delay
                    setTimeout(() => {
                        supportModal.style.display = 'none';
                    }, 2000);
                })
                .catch(error => {
                    console.error('Form submission error:', error);
                    showErrorNotification('There was an error sending your message. Please try again or email us directly at mission_support@cyberrts.com');
                });
            });
        }
    }
}

// Success notification system
function showSuccessNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
        color: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(34,197,94,0.3);
        z-index: 10000;
        max-width: 400px;
        font-family: var(--font-primary);
        font-size: 0.95em;
        line-height: 1.4;
        transform: translateX(100%);
        transition: transform 0.5s ease;
        border: 2px solid rgba(34,197,94,0.5);
        backdrop-filter: blur(10px);
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; animation: success-pulse 2s infinite;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22,4 12,14.01 9,11.01"/>
                </svg>
            </div>
            <div>
                <div style="font-weight: bold; margin-bottom: 4px;">Message Sent Successfully!</div>
                <div style="opacity: 0.9;">${message}</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Add success pulse animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes success-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
    `;
    document.head.appendChild(style);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
        }, 500);
    }, 5000);
}

// Error notification system
function showErrorNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(239,68,68,0.3);
        z-index: 10000;
        max-width: 400px;
        font-family: var(--font-primary);
        font-size: 0.95em;
        line-height: 1.4;
        transform: translateX(100%);
        transition: transform 0.5s ease;
        border: 2px solid rgba(239,68,68,0.5);
        backdrop-filter: blur(10px);
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
            </div>
            <div>
                <div style="font-weight: bold; margin-bottom: 4px;">Error Sending Message</div>
                <div style="opacity: 0.9;">${message}</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto-remove after 7 seconds (longer for errors)
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 500);
    }, 7000);
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
                
                // Clean up minimized tabs when dashboard is closed
                if (window.cleanupMinimizedTabs) {
                    window.cleanupMinimizedTabs();
                }
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
                
                // Clean up minimized tabs when dashboard is closed
                if (window.cleanupMinimizedTabs) {
                    window.cleanupMinimizedTabs();
                }
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

// CAPCOM Kelly button functionality
function initCapcomKellyButton() {
    const kellyBtn = document.getElementById('capcom-kelly-btn');
    const kellyModal = document.getElementById('capcom-kelly-modal');
    const closeBtn = document.getElementById('capcom-modal-close');
    
    if (kellyBtn && kellyModal) {
        // Toggle modal on button click
        kellyBtn.addEventListener('click', () => {
            if (kellyModal.style.display === 'flex') {
                kellyModal.style.display = 'none';
            } else {
                kellyModal.style.display = 'flex';
            }
        });
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                kellyModal.style.display = 'none';
            });
        }
        
        // Close on outside click
        kellyModal.addEventListener('click', (e) => {
            if (e.target === kellyModal) {
                kellyModal.style.display = 'none';
            }
        });
    }
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
            
            // Show CyberRTS logo after loading
            const cyberrtsLogo = document.getElementById('cyberrts-logo-link');
            if (cyberrtsLogo) {
                cyberrtsLogo.style.display = 'block';
            }
            
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


// Initialize Red Orbit SDA integration
function initRedOrbitSDA() {
    // Handle both trigger buttons (one in SDA tab, one in Kessler tab)
    const triggerBtns = [
        document.getElementById('trigger-kessler'),
        document.getElementById('trigger-kessler-tab')
    ];
    
    triggerBtns.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                if (window.redOrbitPhysics) {
                    // Trigger collision event
                    const event = new CustomEvent('redOrbitCollision');
                    window.dispatchEvent(event);
                    
                    // Update both buttons
                    triggerBtns.forEach(b => {
                        if (b) {
                            b.textContent = 'ACTIVE';
                            b.style.background = '#ff0000';
                            b.disabled = true;
                        }
                    });
                    
                    // Update debris counts in both tabs
                    const debrisCountEls = [
                        document.getElementById('active-debris-count'),
                        document.getElementById('kessler-debris-count')
                    ];
                    debrisCountEls.forEach(el => {
                        if (el) el.textContent = '0';
                    });
                    
                    // Re-enable after 5 seconds
                    setTimeout(() => {
                        triggerBtns.forEach(b => {
                            if (b) {
                                b.textContent = 'Trigger Event';
                                b.style.background = 'linear-gradient(135deg, #ff6600 0%, #ff3300 100%)';
                                b.disabled = false;
                            }
                        });
                    }, 5000);
                }
            });
        }
    });
    
    // Initialize tab switching
    const tabs = document.querySelectorAll('.sda-tab');
    const panels = document.querySelectorAll('.sda-tab-panel');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            // Update tab styles
            tabs.forEach(t => {
                t.classList.remove('active');
                t.style.background = 'rgba(0, 0, 0, 0.3)';
                t.style.color = '#999';
                t.style.borderTop = '2px solid transparent';
            });
            
            tab.classList.add('active');
            tab.style.background = 'rgba(255, 0, 0, 0.2)';
            tab.style.color = '#ff6666';
            tab.style.borderTop = '2px solid #ff0000';
            
            // Show/hide panels
            panels.forEach(panel => {
                if (panel.id === `${targetTab}-tab`) {
                    panel.style.display = 'block';
                } else {
                    panel.style.display = 'none';
                }
            });
        });
    });
    
    // Update debris count periodically
    setInterval(() => {
        const debrisCount = document.getElementById('active-debris-count');
        const riskLevel = document.getElementById('collision-risk');
        const objectsTracked = document.getElementById('objects-tracked-count');
        
        if (window.redOrbitPhysics && window.redOrbitPhysics.getStats) {
            const stats = window.redOrbitPhysics.getStats();
            
            // Update debris count
            if (debrisCount) {
                debrisCount.textContent = stats.debrisCount;
            }
            
            // Update total objects tracked
            if (objectsTracked) {
                objectsTracked.textContent = stats.totalObjects;
            }
            
            // Update risk level based on stats
            if (riskLevel) {
                riskLevel.textContent = stats.highestRisk || 'LOW';
                if (stats.highestRisk === 'CRITICAL') {
                    riskLevel.style.color = '#ff0000';
                } else if (stats.highestRisk === 'HIGH') {
                    riskLevel.style.color = '#ff4400';
                } else if (stats.highestRisk === 'MEDIUM') {
                    riskLevel.style.color = '#ff8800';
                } else {
                    riskLevel.style.color = '#00ff00';
                }
            }
        }
    }, 500);
}

// Show control buttons after scene loads
export function showHelpButton() {
    // Most UI elements removed - only SDA remains
    const controlDock = document.getElementById('control-dock');
    if (controlDock) {
        controlDock.style.display = 'flex';
        controlDock.classList.add('dock-enter');
    }
    
    // IMMEDIATELY fix time display visibility
    const timeDisplay = document.getElementById('time-display');
    if (timeDisplay) {
        // Remove hide-time class from body if it exists
        document.body.classList.remove('hide-time');
        // Ensure time display is visible
        timeDisplay.style.display = '';
    }
    
    // Set up help button to show welcome modal
    const helpBtn = document.getElementById('help-sphere-btn');
    if (helpBtn) {
        helpBtn.addEventListener('click', () => {
            const welcomeModal = document.getElementById('welcome-modal');
            if (welcomeModal) {
                welcomeModal.style.display = 'flex';
            }
        });
    }
    
    // Set up Red Orbit button to show Red Orbit modal
    const redOrbitBtn = document.getElementById('red-orbit-btn');
    if (redOrbitBtn) {
        redOrbitBtn.addEventListener('click', () => {
            const redOrbitModal = document.getElementById('red-orbit-modal');
            if (redOrbitModal) {
                redOrbitModal.style.display = 'flex';
                // Start countdown when modal opens
                startCollisionCountdown();
            }
        });
    }
    
    // Show SDA toggle button now that the simulation is loaded
    const sdaToggleBtn = document.getElementById('sda-toggle-btn');
    if (sdaToggleBtn) {
        // SDA button is in the dock, no need to set display
    }
    
    // Set up support button to show support modal
    const supportBtn = document.getElementById('support-btn');
    if (supportBtn) {
        supportBtn.addEventListener('click', () => {
            const supportModal = document.getElementById('support-modal');
            if (supportModal) {
                supportModal.style.display = 'flex';
            }
        });
    }
    
    // IMMEDIATELY set up settings button
    const simulationSettingsBtn = document.getElementById('simulation-settings-btn');
    if (simulationSettingsBtn) {
        // Remove any existing event listeners by cloning (clean slate)
        const newSettingsBtn = simulationSettingsBtn.cloneNode(true);
        simulationSettingsBtn.parentNode.replaceChild(newSettingsBtn, simulationSettingsBtn);
        
        // Add fresh event listener
        newSettingsBtn.addEventListener('click', () => {
            if (window.showSimulationSettingsModal) {
                window.showSimulationSettingsModal();
            }
        });
    }
    
    // Initialize dock functionality after all buttons are set up
    initControlDock();
    
    // Don't show Add TLE button initially - only when SDA is active
}

// Initialize control dock functionality
function initControlDock() {
    // Small delay to ensure everything is loaded
    setTimeout(() => {
        const controlDock = document.getElementById('control-dock');
        const minimizedDock = document.getElementById('minimized-dock');
        const minimizeBtn = document.getElementById('dock-minimize-btn');
        let isDockMinimized = false;

        // Minimize dock functionality
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => {
                if (!isDockMinimized) {
                    controlDock.classList.add('dock-minimize');
                    setTimeout(() => {
                        controlDock.style.display = 'none';
                        minimizedDock.style.display = 'block';
                        minimizedDock.classList.add('minimized-enter');
                        isDockMinimized = true;
                    }, 300);
                }
            });
        }

        // Restore dock functionality
        if (minimizedDock) {
            minimizedDock.addEventListener('click', () => {
                if (isDockMinimized) {
                    minimizedDock.style.display = 'none';
                    minimizedDock.classList.remove('minimized-enter');
                    controlDock.style.display = 'flex';
                    controlDock.classList.remove('dock-minimize');
                    controlDock.classList.add('dock-enter');
                    isDockMinimized = false;
                }
            });
        }

        // Add keyboard shortcut (Ctrl/Cmd + H) to toggle dock
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
                e.preventDefault();
                if (isDockMinimized) {
                    minimizedDock.click();
                } else {
                    minimizeBtn.click();
                }
            }
        });
    }, 100);
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
        },
        'support-modal': {
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


    // Settings modal override disabled - handled in showHelpButton function now
    // const settingsBtn = document.getElementById('simulation-settings-btn');
    // if (settingsBtn) {
    //     // Remove existing listeners by cloning
    //     const newSettingsBtn = settingsBtn.cloneNode(true);
    //     settingsBtn.parentNode.replaceChild(newSettingsBtn, settingsBtn);
    //     
    //     newSettingsBtn.addEventListener('click', () => {
    //         const settingsModal = document.getElementById('simulation-settings-modal');
    //         if (settingsModal && settingsModal.style.display === 'flex') {
    //             window.closeAllModals();
    //         } else {
    //             window.openModal('simulation-settings-modal');
    //             // Call the original settings modal function to populate data
    //             if (window.showSimulationSettingsModal) {
    //                 window.showSimulationSettingsModal();
    //             }
    //         }
    //     });
    // }
}

// Red Orbit collision countdown
let countdownInterval = null;
let countdownTime = 30; // 30 seconds

function startCollisionCountdown() {
    countdownTime = 30;
    const timerElement = document.getElementById('countdown-timer');
    
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    countdownInterval = setInterval(() => {
        countdownTime--;
        
        if (timerElement) {
            const minutes = Math.floor(countdownTime / 60);
            const seconds = countdownTime % 60;
            timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            
            // Change color as time runs out
            if (countdownTime <= 10) {
                timerElement.style.color = '#ff0000';
                timerElement.style.animation = 'pulse 0.5s infinite';
            }
        }
        
        if (countdownTime <= 0) {
            clearInterval(countdownInterval);
            // Auto-trigger collision
            triggerCollisionFromModal();
        }
    }, 1000);
}

function stopCollisionCountdown() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
}

function activateCollisionScenario() {
    // Move satellites into collision course
    console.log('Activating Red Orbit collision scenario...');
    
    // Get satellites
    const satellites = window.satelliteMeshes;
    if (satellites && satellites.CRTS1 && satellites.Bulldog) {
        // Start moving them together
        console.log('Setting satellites on collision course');
    }
}

function triggerCollisionFromModal() {
    // Trigger the actual collision
    if (window.redOrbitPhysics) {
        // Use the collision controls trigger
        const event = new CustomEvent('redOrbitCollision');
        window.dispatchEvent(event);
    }
    
    // Update modal
    const activateBtn = document.getElementById('activate-scenario');
    if (activateBtn) {
        activateBtn.textContent = '💥 IMPACT!';
        activateBtn.style.background = '#ff0000';
    }
}

// Update debris count periodically
setInterval(() => {
    const modalDebrisCount = document.getElementById('modal-debris-count');
    if (modalDebrisCount && window.redOrbitPhysics) {
        const stats = window.redOrbitPhysics.getStats ? window.redOrbitPhysics.getStats() : { debrisCount: window.redOrbitPhysics.debris.size };
        modalDebrisCount.textContent = stats.debrisCount;
    }
}, 1000);