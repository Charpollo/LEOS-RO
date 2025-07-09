# LEOS System Requirements

## Overview
LEOS (Low Earth Orbit Satellite) First Orbit is a 3D satellite visualization system built with Babylon.js. As a real-time 3D application running in your web browser, it requires adequate system resources for optimal performance.

## Minimum Requirements

### Hardware
- **RAM**: 4GB (8GB strongly recommended)
- **Processor**: Dual-core CPU, 2.0GHz or higher
- **Graphics**: Any GPU with WebGL 2.0 support
- **Storage**: 500MB free space for browser cache
- **Internet**: Broadband connection for initial load

### Software
- **Operating System**: Windows 10+, macOS 10.14+, Linux (Ubuntu 20.04+)
- **Browser**: Google Chrome 90+ (strongly recommended for performance)
  - Alternative: Firefox 88+, Safari 14+, Edge 90+
- **Display**: 1280x720 minimum resolution

### Settings for Minimum Specs
```
Render Quality: Low
Update Frequency: 30 FPS
Adaptive Quality: ON
Show FPS Counter: OFF
Atmosphere Effects: Minimal
```

**Note**: Systems with 4GB RAM will experience reduced performance and should avoid enabling SDA visualization (58,000+ objects).

## Recommended Requirements

### Hardware
- **RAM**: 8GB
- **Processor**: Quad-core CPU, 2.5GHz or higher
- **Graphics**: Dedicated GPU (NVIDIA GTX 1050+, AMD RX 560+) or Intel Iris Xe
- **Storage**: 1GB free space for browser cache
- **Internet**: Stable broadband connection

### Software
- **Browser**: Google Chrome (latest version) for best performance
- **Display**: 1920x1080 resolution

### Settings for Recommended Specs
```
Render Quality: Medium/High
Update Frequency: 60 FPS
Adaptive Quality: Optional
All visual effects enabled
Can handle SDA visualization
```

## High-End Requirements

### Hardware
- **RAM**: 16GB or more
- **Processor**: 6+ core CPU, 3.0GHz or higher
- **Graphics**: 
  - NVIDIA RTX 3060+ / GTX 1080+
  - AMD RX 6600+ 
  - Apple M1 Pro/Max/Ultra, M2, M3, M4 series
- **Storage**: 2GB free space
- **Display**: 2560x1440 or 4K resolution

### Software
- **Browser**: Google Chrome (latest version) with hardware acceleration
- **Display**: High refresh rate monitor (120Hz+) for smooth animations

### Settings for High-End Specs
```
Render Quality: High/Ultra
Update Frequency: 120 FPS
Adaptive Quality: OFF
All visual effects at maximum
Full SDA visualization with 58,000+ objects
Multiple satellite tracking
Advanced telemetry displays
```

## Performance Tips

### For All Systems
1. **Use Google Chrome** - Provides 20-40% better WebGL performance than other browsers
2. **Close unnecessary tabs and applications** to free up RAM
3. **Ensure hardware acceleration is enabled** in your browser settings
4. **Update graphics drivers** to the latest version

### For Lower-End Systems
1. Start with Low quality settings and adjust upward if performance allows
2. Disable "Show Satellite Labels" to reduce overhead
3. Avoid activating SDA mode with thousands of objects
4. Limit active ground station connections
5. Use "Performance Mode" preset in settings

### Browser Performance Ranking
1. **Google Chrome** - Best overall performance
2. **Microsoft Edge** - Close second (uses same engine as Chrome)
3. **Safari** - Good on Apple Silicon Macs
4. **Firefox** - Adequate but 20-40% slower for WebGL

## Troubleshooting

### Poor Performance
- Switch to Chrome if using another browser
- Lower the Render Quality setting
- Enable Adaptive Quality
- Close other applications
- Check if Windows Game Mode or macOS Low Power Mode is affecting performance

### Stuttering or Lag
- Reduce Update Frequency to 30 or 45 FPS
- Disable atmosphere effects
- Clear browser cache
- Ensure no background downloads/updates are running

### Browser Crashes
- Indicates insufficient RAM
- Lower quality settings
- Avoid SDA visualization mode
- Consider upgrading system RAM

## Mobile/Tablet Support
Currently, LEOS is optimized for desktop browsers only. Mobile and tablet support may be limited due to:
- Touch control limitations
- Reduced GPU capabilities
- Memory constraints
- WebGL implementation differences

---

*Last updated: January 2025*