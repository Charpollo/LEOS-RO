import * as BABYLON from '@babylonjs/core';

export class ProgressiveAssetLoader {
    constructor(scene) {
        this.scene = scene;
        this.loadQueue = [];
        this.loadedAssets = new Map();
        this.onProgress = null;
        this.onComplete = null;
    }

    // Priority levels: 0 = critical, 1 = high, 2 = medium, 3 = low
    addToQueue(assetPath, assetType, priority = 2, options = {}) {
        this.loadQueue.push({ path: assetPath, type: assetType, priority, options });
        this.loadQueue.sort((a, b) => a.priority - b.priority);
    }

    async loadCriticalAssets() {
        // Load only essential assets for initial render
        const criticalAssets = [
            { path: 'assets/earth_diffuse.png', type: 'texture', priority: 0 },
            { path: 'assets/stars.png', type: 'texture', priority: 0 }
        ];

        for (const asset of criticalAssets) {
            await this.loadAsset(asset);
        }
    }

    async loadAsset(assetInfo) {
        const { path, type, options } = assetInfo;
        
        try {
            let asset;
            switch (type) {
                case 'texture':
                    asset = await this.loadTexture(path, options);
                    break;
                case 'model':
                    asset = await this.loadModel(path, options);
                    break;
                case 'cubemap':
                    asset = await this.loadCubeMap(path, options);
                    break;
            }
            
            this.loadedAssets.set(path, asset);
            if (this.onProgress) {
                this.onProgress(this.loadedAssets.size, this.loadQueue.length);
            }
            return asset;
        } catch (error) {
            console.error(`Failed to load asset: ${path}`, error);
            return null;
        }
    }

    async loadTexture(path, options = {}) {
        return new Promise((resolve, reject) => {
            // First try loading a low-res placeholder if available
            const placeholderPath = path.replace(/\.(png|jpg)$/, '_low.$1');
            
            const texture = new BABYLON.Texture(path, this.scene, 
                options.noMipmap || false,
                options.invertY || false,
                options.samplingMode || BABYLON.Texture.BILINEAR_SAMPLINGMODE,
                () => resolve(texture),
                (message, exception) => {
                    console.warn(`Texture load failed: ${path}`, message);
                    // Try fallback texture
                    if (options.fallback) {
                        const fallbackTexture = new BABYLON.Texture(options.fallback, this.scene);
                        resolve(fallbackTexture);
                    } else {
                        reject(exception);
                    }
                }
            );
        });
    }

    async loadModel(path, options = {}) {
        // Load low-poly version first if available
        const lowPolyPath = path.replace(/\.glb$/, '_low.glb');
        
        try {
            // Check if low-poly version exists
            const response = await fetch(lowPolyPath, { method: 'HEAD' });
            if (response.ok) {
                console.log(`Loading low-poly version: ${lowPolyPath}`);
                const result = await BABYLON.SceneLoader.LoadAssetContainerAsync('', lowPolyPath, this.scene);
                
                // Schedule high-res load for later
                setTimeout(() => {
                    this.loadHighResModel(path, result);
                }, 5000);
                
                return result;
            }
        } catch (e) {
            // Low-poly not available, load regular
        }
        
        return BABYLON.SceneLoader.LoadAssetContainerAsync('', path, this.scene);
    }

    async loadHighResModel(path, lowPolyContainer) {
        try {
            const highResContainer = await BABYLON.SceneLoader.LoadAssetContainerAsync('', path, this.scene);
            // Swap models smoothly
            this.swapModels(lowPolyContainer, highResContainer);
        } catch (error) {
            console.warn('High-res model load failed, keeping low-poly', error);
        }
    }

    swapModels(oldContainer, newContainer) {
        // Implement smooth model swapping logic
        oldContainer.dispose();
        newContainer.addAllToScene();
    }

    async loadRemainingAssets() {
        // Load remaining assets in background
        for (const asset of this.loadQueue) {
            if (!this.loadedAssets.has(asset.path)) {
                await this.loadAsset(asset);
                // Small delay between loads to prevent blocking
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }
        
        if (this.onComplete) {
            this.onComplete();
        }
    }

    getAsset(path) {
        return this.loadedAssets.get(path);
    }
}