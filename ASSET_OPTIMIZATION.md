# LEOS Asset Optimization Guide

This guide explains how to manually optimize assets for fast web deployment in the LEOS application.

## 📊 Why Asset Optimization Matters

**Before Optimization**: 563 MB total assets (3+ minute load times)  
**After Optimization**: 65 MB total assets (~15 second load times)  
**Result**: 88% size reduction, 12x faster loading

## 🎯 Asset Types That Need Optimization

### 1. 3D Models (.glb/.gltf files)
- **Unoptimized**: 100-500 MB per model
- **Optimized**: 5-60 MB per model
- **Savings**: 85-95% size reduction

### 2. Large Textures (.png/.jpg files)
- **Unoptimized**: 10-50 MB per texture
- **Optimized**: 1-5 MB per texture (WebP format)
- **Savings**: 70-90% size reduction

### 3. Audio/Video Files
- **Unoptimized**: Variable sizes
- **Optimized**: Compressed formats with quality control

---

## 🛠️ Manual Optimization Procedures

### Prerequisites

Install required tools globally:
```bash
npm install -g @gltf-transform/cli
npm install -g imagemin-cli imagemin-webp
```

---

## 🚀 3D Model Optimization

### Method 1: Using Our Optimization Script (Recommended)

1. **Add your model to the script**:
   ```javascript
   // Edit scripts/optimize-models.js
   const models = [
     'bulldog_sat.glb',
     'crts_satellite.glb',
     'your_new_model.glb'  // Add here
   ];
   ```

2. **Run optimization**:
   ```bash
   npm run optimize:models
   ```

3. **Check results**:
   ```bash
   ls -la frontend/assets/*.glb
   # Original files are saved as *_original.glb
   ```

### Method 2: Manual Optimization

For individual models:

```bash
cd frontend/assets

# Conservative optimization (good quality, moderate compression)
npx gltf-transform optimize input.glb output.glb \
  --compress draco \
  --simplify 0.9 \
  --simplify-error 0.001

# Aggressive optimization (maximum compression)
npx gltf-transform optimize input.glb output.glb \
  --compress draco \
  --texture-compress webp \
  --simplify 0.75 \
  --simplify-error 0.0001 \
  --dedupe \
  --prune

# Replace original
mv output.glb input.glb
```

### Optimization Levels

| Level | Simplify | Error | Use Case | Size Reduction |
|-------|----------|-------|----------|----------------|
| **Light** | 0.95 | 0.0001 | Hero models, close-up viewing | 70-85% |
| **Medium** | 0.9 | 0.001 | General models | 85-92% |
| **Heavy** | 0.75 | 0.01 | Background/distant models | 92-97% |

---

## 🖼️ Texture Optimization

### Converting to WebP (Recommended)

```bash
cd frontend/assets

# Single file conversion
npx imagemin earth_diffuse.png --out-dir=. --plugin=webp --plugin.quality=85

# Batch conversion
npx imagemin *.png --out-dir=optimized --plugin=webp --plugin.quality=85

# For JPEG sources
npx imagemin *.jpg --out-dir=optimized --plugin=webp --plugin.quality=80
```

### Quality Guidelines

| Quality | Use Case | File Size | Visual Quality |
|---------|----------|-----------|----------------|
| **95** | Hero textures, UI elements | Largest | Indistinguishable |
| **85** | Main textures (Earth, Moon) | Medium | Excellent |
| **75** | Secondary textures | Small | Very Good |
| **65** | Background textures | Smallest | Good |

### Manual Tools Alternative

If command line tools aren't available:
1. Use [Squoosh.app](https://squoosh.app) for online compression
2. Use Adobe Photoshop "Export for Web"
3. Use GIMP with WebP export plugin

---

## 🎵 Audio/Video Optimization

### Audio Files (.mp3/.wav)

```bash
# Convert to compressed format
ffmpeg -i input.wav -codec:a libmp3lame -b:a 128k output.mp3

# For space audio (mono is usually fine)
ffmpeg -i input.wav -codec:a libmp3lame -b:a 96k -ac 1 output.mp3
```

### Video Files (.mp4/.webm)

```bash
# Web-optimized MP4
ffmpeg -i input.mov -codec:v libx264 -crf 23 -codec:a aac -b:a 128k output.mp4

# Smaller WebM format
ffmpeg -i input.mov -codec:v libvpx-vp9 -crf 30 -codec:a libvorbis output.webm
```

---

## 📋 Step-by-Step Checklist

### Before Adding New Assets:

- [ ] Check file size (`ls -la assets/newfile.*`)
- [ ] If > 10 MB, optimization is required
- [ ] Create backup of original file

### For 3D Models:

- [ ] Place model in `frontend/assets/`
- [ ] Add to optimization script or run manual optimization
- [ ] Test model loads correctly in browser
- [ ] Verify visual quality is acceptable
- [ ] Check file size reduction

### For Textures:

- [ ] Convert large PNG/JPG to WebP format
- [ ] Use quality 85 for main textures, 75 for secondary
- [ ] Update code references if filename changes
- [ ] Test loading and visual quality

### For Audio/Video:

- [ ] Compress to web-appropriate bitrates
- [ ] Test playback in target browsers
- [ ] Ensure file size is reasonable for web delivery

---

## 🔧 Verification & Testing

### Check File Sizes
```bash
# View all asset sizes
ls -lah frontend/assets/

# Check total asset directory size
du -sh frontend/assets/
```

### Test Local Loading
```bash
# Start local server and test load times
./run-frontend.sh --port 8000

# Check browser dev tools network tab for:
# - Total download size
# - Load times
# - Failed requests
```

### Performance Targets

| Asset Type | Target Size | Max Acceptable |
|------------|-------------|----------------|
| **3D Models** | < 20 MB each | < 50 MB |
| **Textures** | < 2 MB each | < 5 MB |
| **Audio** | < 1 MB each | < 3 MB |
| **Total Assets** | < 100 MB | < 200 MB |

---

## 🚨 Troubleshooting

### Model Won't Load After Optimization

1. **Check file corruption**:
   ```bash
   npx gltf-validator frontend/assets/model.glb
   ```

2. **Try more conservative settings**:
   ```bash
   npx gltf-transform optimize model_original.glb model.glb \
     --compress draco \
     --simplify 0.95
   ```

3. **Restore from backup**:
   ```bash
   cp model_original.glb model.glb
   ```

### Texture Quality Issues

1. **Increase WebP quality**:
   ```bash
   npx imagemin texture.png --plugin=webp --plugin.quality=90
   ```

2. **Use PNG for textures with transparency**
3. **Check if texture coordinates are preserved**

### Load Time Still Slow

1. **Check total asset size**: Should be < 100 MB
2. **Verify Netlify compression** is enabled in `netlify.toml`
3. **Consider progressive loading** for large assets
4. **Check network tab** in browser dev tools

---

## 📈 Expected Results

After following this guide:

- **Initial load time**: 15-30 seconds (vs 3+ minutes)
- **Time to interactive**: 5-10 seconds  
- **Total download**: < 100 MB (vs 500+ MB)
- **Visual quality**: Indistinguishable from originals
- **User experience**: Professional, responsive application

---

## 🔄 Backup & Recovery

### Automatic Backups
Our optimization script automatically creates backups:
- `model.glb` → `model_original.glb`
- Always keep originals for future re-optimization

### Manual Backup Strategy
```bash
# Before optimizing, create dated backup
cp important_model.glb important_model_backup_$(date +%Y%m%d).glb

# Restore if needed
cp important_model_backup_20250703.glb important_model.glb
```

---

## 🎯 Next Steps: Automation

This manual process will be automated with:
- **Auto-discovery** of new assets
- **Batch optimization** scripts  
- **CI/CD integration** for automatic optimization
- **Quality validation** to ensure optimization success

For now, follow this manual guide to maintain fast loading times as you add new assets to LEOS!

---

## 📞 Need Help?

If optimization fails or results are unsatisfactory:
1. Check the troubleshooting section above
2. Verify file integrity with validation tools
3. Try more conservative optimization settings
4. Keep original files as fallback