export class LoadingManager {
    constructor() {
        this.totalAssets = 0;
        this.loadedAssets = 0;
        this.criticalAssetsLoaded = false;
        this.loadingScreen = null;
        this.progressBar = null;
        this.statusText = null;
        this.startTime = Date.now();
    }

    init() {
        // Enhance existing loading screen
        this.loadingScreen = document.querySelector('.loading-screen');
        if (!this.loadingScreen) {
            this.createLoadingScreen();
        }

        // Add progress bar
        this.createProgressBar();
        
        // Track loading stages
        this.stages = {
            'Initializing': { weight: 10, complete: false },
            'Loading Essential Assets': { weight: 30, complete: false },
            'Creating Scene': { weight: 20, complete: false },
            'Loading Textures': { weight: 20, complete: false },
            'Preparing Satellites': { weight: 15, complete: false },
            'Final Setup': { weight: 5, complete: false }
        };
    }

    createLoadingScreen() {
        this.loadingScreen = document.createElement('div');
        this.loadingScreen.className = 'loading-screen';
        this.loadingScreen.innerHTML = `
            <div class="loading-content">
                <div class="loading-logo">
                    <img src="assets/leos_logo.png" alt="LEOS">
                </div>
                <h1>LEOS First Orbit</h1>
                <div class="loading-status">Initializing...</div>
                <div class="loading-progress-container">
                    <div class="loading-progress-bar"></div>
                </div>
                <div class="loading-details">
                    <span class="loading-percentage">0%</span>
                    <span class="loading-time"></span>
                </div>
                <div class="loading-tips">
                    <p>Tip: Use mouse to orbit, scroll to zoom</p>
                </div>
            </div>
        `;
        document.body.appendChild(this.loadingScreen);
    }

    createProgressBar() {
        this.progressBar = this.loadingScreen.querySelector('.loading-progress-bar');
        this.statusText = this.loadingScreen.querySelector('.loading-status');
        this.percentageText = this.loadingScreen.querySelector('.loading-percentage');
        this.timeText = this.loadingScreen.querySelector('.loading-time');
        
        // Add CSS for smooth animations
        const style = document.createElement('style');
        style.textContent = `
            .loading-progress-container {
                width: 300px;
                height: 4px;
                background: rgba(0, 207, 255, 0.2);
                border-radius: 2px;
                margin: 20px auto;
                overflow: hidden;
            }
            
            .loading-progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #00cfff, #66d9ff);
                width: 0%;
                transition: width 0.3s ease;
                box-shadow: 0 0 10px rgba(0, 207, 255, 0.5);
            }
            
            .loading-details {
                display: flex;
                justify-content: space-between;
                width: 300px;
                margin: 10px auto;
                font-size: 12px;
                color: #66d9ff;
            }
            
            .loading-tips {
                margin-top: 30px;
                font-size: 14px;
                color: #999;
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 0.5; }
                50% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    updateStage(stageName) {
        if (this.stages[stageName]) {
            this.stages[stageName].complete = true;
            this.updateProgress();
            this.statusText.textContent = stageName + '...';
        }
    }

    updateProgress() {
        // Calculate weighted progress
        let totalWeight = 0;
        let completedWeight = 0;
        
        Object.values(this.stages).forEach(stage => {
            totalWeight += stage.weight;
            if (stage.complete) {
                completedWeight += stage.weight;
            }
        });
        
        const percentage = Math.round((completedWeight / totalWeight) * 100);
        this.progressBar.style.width = percentage + '%';
        this.percentageText.textContent = percentage + '%';
        
        // Update time
        const elapsed = Math.round((Date.now() - this.startTime) / 1000);
        this.timeText.textContent = `${elapsed}s`;
    }

    setAssetCount(count) {
        this.totalAssets = count;
    }

    assetLoaded(assetName) {
        this.loadedAssets++;
        console.log(`Loaded: ${assetName} (${this.loadedAssets}/${this.totalAssets})`);
        
        if (this.totalAssets > 0) {
            const assetProgress = (this.loadedAssets / this.totalAssets) * 100;
            // Update within current stage
            if (this.statusText.textContent.includes('Assets')) {
                this.statusText.textContent = `Loading Assets... (${Math.round(assetProgress)}%)`;
            }
        }
    }

    markCriticalAssetsLoaded() {
        this.criticalAssetsLoaded = true;
        console.log('Critical assets loaded - scene can start rendering');
    }

    complete() {
        // Ensure we're at 100%
        Object.keys(this.stages).forEach(stage => {
            this.stages[stage].complete = true;
        });
        this.updateProgress();
        
        this.statusText.textContent = 'Ready!';
        
        // Fade out after a short delay
        setTimeout(() => {
            this.loadingScreen.style.transition = 'opacity 0.5s ease-out';
            this.loadingScreen.style.opacity = '0';
            
            setTimeout(() => {
                this.loadingScreen.style.display = 'none';
                this.loadingScreen.remove();
            }, 500);
        }, 500);
        
        const totalTime = (Date.now() - this.startTime) / 1000;
        console.log(`Total load time: ${totalTime.toFixed(1)}s`);
    }
}