// Aurora background animation for loading screen
// Based on the reference Three.js aurora comet effect
// Adapted to use LEOS brand colors: neon blue (#00cfff), deep blue tones

let auroraCanvas, auroraGL, auroraProgram, auroraVertexBuffer;
let auroraStartTime = Date.now();
let auroraAnimationId = null;
let lastFrameTime = 0;
const TARGET_FPS = 30; // Reduced FPS during loading for smoother experience
const FRAME_TIME = 1000 / TARGET_FPS;

export function initAuroraBackground() {
    // Delay aurora initialization to not compete with initial page load
    setTimeout(() => {
        initAuroraBackgroundDelayed();
    }, 200);
}

function initAuroraBackgroundDelayed() {
    auroraCanvas = document.getElementById('aurora-canvas');
    if (!auroraCanvas) return;
    
    // Get WebGL context
    auroraGL = auroraCanvas.getContext('webgl') || auroraCanvas.getContext('experimental-webgl');
    if (!auroraGL) {
        console.warn('WebGL not supported, falling back to static background');
        return;
    }
    
    // Set canvas size
    resizeAuroraCanvas();
    
    // Vertex shader
    const vertexShaderSource = `
        attribute vec2 position;
        void main() {
            gl_Position = vec4(position, 0.0, 1.0);
        }
    `;
    
    // Fragment shader with LEOS brand colors
    const fragmentShaderSource = `
        precision mediump float;
        uniform float iTime;
        uniform vec2 iResolution;
        
        #define NUM_OCTAVES 3
        
        float rand(vec2 n) { 
            return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
        }
        
        float noise(vec2 p){
            vec2 ip = floor(p);
            vec2 u = fract(p);
            u = u*u*(3.0-2.0*u);
            
            float res = mix(
                mix(rand(ip),rand(ip+vec2(1.0,0.0)),u.x),
                mix(rand(ip+vec2(0.0,1.0)),rand(ip+vec2(1.0,1.0)),u.x),u.y);
            return res*res;
        }
        
        float fbm(vec2 x) {
            float v = 0.0;
            float a = 0.3;
            vec2 shift = vec2(100.0);
            // Manual matrix multiplication for WebGL compatibility
            for (int i = 0; i < NUM_OCTAVES; ++i) {
                v += a * noise(x);
                // Apply rotation manually: rot * x where rot = [[cos(0.5), sin(0.5)], [-sin(0.5), cos(0.5)]]
                float cos_val = cos(0.5);
                float sin_val = sin(0.5);
                vec2 rotated = vec2(cos_val * x.x + sin_val * x.y, -sin_val * x.x + cos_val * x.y);
                x = rotated * 2.0 + shift;
                a *= 0.4;
            }
            return v;
        }
        
        void main() {
            vec2 shake = vec2(sin(iTime * 1.2) * 0.005, cos(iTime * 2.1) * 0.005);
            // Manual matrix multiplication for WebGL compatibility
            vec2 fragCoord = gl_FragCoord.xy + shake * iResolution.xy;
            vec2 centered = (fragCoord - iResolution.xy * 0.5) / iResolution.y;
            // Apply transformation matrix manually: [[6.0, -4.0], [4.0, 6.0]]
            vec2 p = vec2(6.0 * centered.x - 4.0 * centered.y, 4.0 * centered.x + 6.0 * centered.y);
            vec2 v;
            vec4 o = vec4(0.0);
            
            float f = 2.0 + fbm(p + vec2(iTime * 5.0, 0.0)) * 0.5; 
            
            // Reduced iteration count for better performance during loading
            for(float i = 0.0; i < 20.0; i++)
            {
                v = p + cos((i + 1.0) * (i + 1.0) + (iTime + p.x * 0.08) * 0.025 + (i + 1.0) * vec2(13.0, 11.0)) * 3.5 + vec2(sin(iTime * 3.0 + (i + 1.0)) * 0.003, cos(iTime * 3.5 - (i + 1.0)) * 0.003);
                
                float tailNoise = fbm(v + vec2(iTime * 0.5, (i + 1.0))) * 0.3 * (1.0 - ((i + 1.0) / 20.0)); 
                
                // Red Orbit colors: red (#ff0000) and yellow (#ffff00) disaster tones
                vec4 auroraColors = vec4(
                    0.9 + 0.1 * sin((i + 1.0) * 0.2 + iTime * 0.4),  // Red component (dominant)
                    0.3 + 0.5 * cos((i + 1.0) * 0.3 + iTime * 0.5),  // Green component (for yellow mix)
                    0.0 + 0.1 * sin((i + 1.0) * 0.4 + iTime * 0.3),  // Blue component (minimal)
                    1.0
                );
                
                vec4 currentContribution = auroraColors * exp(sin((i + 1.0) * (i + 1.0) + iTime * 0.8)) / length(max(v, vec2(v.x * f * 0.015, v.y * 1.5)));
                
                // Thinner comets for more elegant look
                float thinnessFactor = smoothstep(0.0, 1.0, (i + 1.0) / 20.0) * 0.6; 
                o += currentContribution * (1.0 + tailNoise * 0.8) * thinnessFactor;
            }
            
            // Brightness adjustment for cinematic space look (manual tanh approximation)
            vec4 adjusted = pow(o / 120.0, vec4(1.4));
            // Manual tanh approximation: tanh(x) ≈ x / (1.0 + abs(x))
            adjusted = adjusted / (1.0 + abs(adjusted));
            gl_FragColor = adjusted * 1.2; // Subtle brightness boost
        }
    `;
    
    // Create shaders
    const vertexShader = createShader(auroraGL.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(auroraGL.FRAGMENT_SHADER, fragmentShaderSource);
    
    if (!vertexShader || !fragmentShader) {
        console.error('Failed to create aurora shaders');
        return;
    }
    
    // Create program
    auroraProgram = auroraGL.createProgram();
    auroraGL.attachShader(auroraProgram, vertexShader);
    auroraGL.attachShader(auroraProgram, fragmentShader);
    auroraGL.linkProgram(auroraProgram);
    
    if (!auroraGL.getProgramParameter(auroraProgram, auroraGL.LINK_STATUS)) {
        console.error('Aurora shader program failed to link:', auroraGL.getProgramInfoLog(auroraProgram));
        return;
    }
    
    // Create vertex buffer (full screen quad)
    const vertices = new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
         1.0,  1.0
    ]);
    
    auroraVertexBuffer = auroraGL.createBuffer();
    auroraGL.bindBuffer(auroraGL.ARRAY_BUFFER, auroraVertexBuffer);
    auroraGL.bufferData(auroraGL.ARRAY_BUFFER, vertices, auroraGL.STATIC_DRAW);
    
    // Start animation
    startAuroraAnimation();
}

function createShader(type, source) {
    const shader = auroraGL.createShader(type);
    auroraGL.shaderSource(shader, source);
    auroraGL.compileShader(shader);
    
    if (!auroraGL.getShaderParameter(shader, auroraGL.COMPILE_STATUS)) {
        console.error('Aurora shader compilation error:', auroraGL.getShaderInfoLog(shader));
        auroraGL.deleteShader(shader);
        return null;
    }
    
    return shader;
}

function startAuroraAnimation() {
    function animate(currentTime) {
        if (!auroraCanvas || !auroraGL || !auroraProgram) return;
        
        // Throttle to target FPS for smoother loading experience
        if (currentTime - lastFrameTime < FRAME_TIME) {
            auroraAnimationId = requestAnimationFrame(animate);
            return;
        }
        lastFrameTime = currentTime;
        
        // Check if loading screen is still visible
        const loadingScreen = document.getElementById('loading-screen');
        if (!loadingScreen || loadingScreen.style.display === 'none') {
            stopAuroraAnimation();
            return;
        }
        
        const timeElapsed = (Date.now() - auroraStartTime) / 1000.0;
        
        // Set viewport
        auroraGL.viewport(0, 0, auroraCanvas.width, auroraCanvas.height);
        
        // Clear with black background
        auroraGL.clearColor(0.0, 0.0, 0.0, 1.0);
        auroraGL.clear(auroraGL.COLOR_BUFFER_BIT);
        
        // Use program
        auroraGL.useProgram(auroraProgram);
        
        // Set uniforms
        const timeLocation = auroraGL.getUniformLocation(auroraProgram, 'iTime');
        const resolutionLocation = auroraGL.getUniformLocation(auroraProgram, 'iResolution');
        
        auroraGL.uniform1f(timeLocation, timeElapsed);
        auroraGL.uniform2f(resolutionLocation, auroraCanvas.width, auroraCanvas.height);
        
        // Set vertex attribute
        const positionLocation = auroraGL.getAttribLocation(auroraProgram, 'position');
        auroraGL.bindBuffer(auroraGL.ARRAY_BUFFER, auroraVertexBuffer);
        auroraGL.enableVertexAttribArray(positionLocation);
        auroraGL.vertexAttribPointer(positionLocation, 2, auroraGL.FLOAT, false, 0, 0);
        
        // Draw
        auroraGL.drawArrays(auroraGL.TRIANGLE_STRIP, 0, 4);
        
        auroraAnimationId = requestAnimationFrame(animate);
    }
    
    auroraAnimationId = requestAnimationFrame(animate);
}

function stopAuroraAnimation() {
    if (auroraAnimationId) {
        cancelAnimationFrame(auroraAnimationId);
        auroraAnimationId = null;
    }
}

function resizeAuroraCanvas() {
    if (!auroraCanvas) return;
    
    auroraCanvas.width = window.innerWidth;
    auroraCanvas.height = window.innerHeight;
}

// Handle window resize
window.addEventListener('resize', resizeAuroraCanvas);

// Cleanup when loading screen is hidden
export function cleanupAuroraBackground() {
    stopAuroraAnimation();
    if (auroraGL && auroraProgram) {
        auroraGL.deleteProgram(auroraProgram);
    }
    if (auroraGL && auroraVertexBuffer) {
        auroraGL.deleteBuffer(auroraVertexBuffer);
    }
}
