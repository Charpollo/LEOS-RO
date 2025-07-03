import * as BABYLON from '@babylonjs/core';

export class TextureOptimizer {
    constructor(scene) {
        this.scene = scene;
        this.textureCache = new Map();
        this.pendingTextures = new Map();
    }

    /**
     * Load texture with automatic format selection and compression
     */
    async loadOptimizedTexture(path, options = {}) {
        // Check cache first
        if (this.textureCache.has(path)) {
            return this.textureCache.get(path);
        }

        // Check if already loading
        if (this.pendingTextures.has(path)) {
            return this.pendingTextures.get(path);
        }

        const loadPromise = this._loadTextureWithFallback(path, options);
        this.pendingTextures.set(path, loadPromise);

        try {
            const texture = await loadPromise;
            this.textureCache.set(path, texture);
            this.pendingTextures.delete(path);
            return texture;
        } catch (error) {
            this.pendingTextures.delete(path);
            throw error;
        }
    }

    async _loadTextureWithFallback(path, options) {
        const formats = this._getOptimalFormats();
        
        for (const format of formats) {
            try {
                const texturePath = this._getTexturePathWithFormat(path, format);
                const texture = await this._loadTexture(texturePath, options);
                
                // Apply optimizations
                this._optimizeTexture(texture, options);
                
                return texture;
            } catch (error) {
                console.warn(`Failed to load ${format} texture:`, error);
                continue;
            }
        }

        // Fallback to original path
        const texture = await this._loadTexture(path, options);
        this._optimizeTexture(texture, options);
        return texture;
    }

    _getOptimalFormats() {
        const formats = [];
        
        // Check WebP support
        if (this._supportsWebP()) {
            formats.push('webp');
        }
        
        // Check ASTC support (common on mobile)
        const gl = this.scene.getEngine()._gl;
        if (gl && gl.getExtension('WEBGL_compressed_texture_astc')) {
            formats.push('astc');
        }
        
        // Check DXT/S3TC support (common on desktop)
        if (gl && gl.getExtension('WEBGL_compressed_texture_s3tc')) {
            formats.push('dds');
        }
        
        // Always include standard formats as fallback
        formats.push('jpg', 'png');
        
        return formats;
    }

    _supportsWebP() {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const result = canvas.toDataURL('image/webp').indexOf('image/webp') === 5;
        return result;
    }

    _getTexturePathWithFormat(originalPath, format) {
        return originalPath.replace(/\.(jpg|jpeg|png)$/i, `.${format}`);
    }

    async _loadTexture(path, options) {
        return new Promise((resolve, reject) => {
            const texture = new BABYLON.Texture(
                path,
                this.scene,
                options.noMipmap || false,
                options.invertY || true,
                options.samplingMode || BABYLON.Texture.TRILINEAR_SAMPLINGMODE,
                () => resolve(texture),
                (message, exception) => reject(new Error(message))
            );
        });
    }

    _optimizeTexture(texture, options) {
        // Enable texture compression if supported
        if (!options.noCompression) {
            texture.optimizeUVAllocation = true;
        }

        // Reduce texture size for distant objects
        if (options.lodBias) {
            texture.lodLevelInAlpha = options.lodBias;
        }

        // Use lower quality sampling for performance
        if (options.performanceMode) {
            texture.samplingMode = BABYLON.Texture.BILINEAR_SAMPLINGMODE;
            texture.anisotropicFilteringLevel = 1;
        } else {
            texture.anisotropicFilteringLevel = 4; // Balanced quality
        }

        // Clamp textures to reduce memory usage
        if (!options.wrap) {
            texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
            texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
        }

        return texture;
    }

    /**
     * Preload critical textures with lower resolution
     */
    async preloadCriticalTextures(texturePaths) {
        const promises = texturePaths.map(path => 
            this.loadOptimizedTexture(path, { 
                performanceMode: true,
                noMipmap: true 
            })
        );
        
        return Promise.all(promises);
    }

    /**
     * Generate texture atlases for multiple small textures
     */
    async createTextureAtlas(texturePaths, atlasSize = 2048) {
        // Implementation for combining multiple textures into an atlas
        // This reduces draw calls and improves performance
        console.log('Texture atlas creation not yet implemented');
        return null;
    }

    /**
     * Clean up unused textures from memory
     */
    cleanupUnusedTextures() {
        const engine = this.scene.getEngine();
        const activeTextures = new Set();
        
        // Find all textures currently in use
        this.scene.materials.forEach(material => {
            const textures = material.getActiveTextures();
            textures.forEach(texture => activeTextures.add(texture));
        });
        
        // Dispose unused cached textures
        this.textureCache.forEach((texture, path) => {
            if (!activeTextures.has(texture)) {
                texture.dispose();
                this.textureCache.delete(path);
                console.log(`Disposed unused texture: ${path}`);
            }
        });
    }
}