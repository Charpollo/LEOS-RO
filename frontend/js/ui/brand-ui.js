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
    
    initPanelToggle();
    initWelcomeModal();
    initInfoPanel();
    initTimeDisplay();
    initTelemetryDashboard();
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

// Time display functionality
function initTimeDisplay() {
    const timeDisplay = document.getElementById('current-time');
    
    function updateTime() {
        if (timeDisplay) {
            const now = new Date();
            const utcTime = now.toUTCString().split(' ')[4]; // Extract time part
            timeDisplay.textContent = `${utcTime} UTC`;
        }
    }
    
    updateTime();
    setInterval(updateTime, 1000);
}

// Telemetry dashboard functionality
function initTelemetryDashboard() {
    const closeDashboard = document.querySelector('.close-dashboard');
    const telemetryDashboard = document.getElementById('advanced-telemetry');
    
    if (closeDashboard && telemetryDashboard) {
        closeDashboard.addEventListener('click', () => {
            hideAdvancedTelemetry();
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
            loadingScreen.style.display = 'none';
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