#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, '../frontend/assets');
const models = [
  'bulldog_sat.glb',
  'crts_satellite.glb'
];

console.log('🚀 Optimizing 3D models for web deployment...\n');

models.forEach(model => {
  const inputPath = path.join(modelsDir, model);
  const outputPath = path.join(modelsDir, model.replace('.glb', '_optimized.glb'));
  const backupPath = path.join(modelsDir, model.replace('.glb', '_original.glb'));
  
  if (!fs.existsSync(inputPath)) {
    console.log(`❌ Model not found: ${model}`);
    return;
  }
  
  const originalSize = (fs.statSync(inputPath).size / 1024 / 1024).toFixed(2);
  console.log(`📦 Processing ${model} (${originalSize} MB)...`);
  
  try {
    // Create backup
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(inputPath, backupPath);
      console.log(`   ✓ Backup created: ${model.replace('.glb', '_original.glb')}`);
    }
    
    // Optimize with aggressive compression
    const command = `npx gltf-transform optimize "${inputPath}" "${outputPath}" \
      --compress draco \
      --texture-compress webp \
      --simplify 0.75 \
      --simplify-error 0.0001`;
    
    execSync(command, { stdio: 'pipe' });
    
    const optimizedSize = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
    const reduction = ((1 - fs.statSync(outputPath).size / fs.statSync(inputPath).size) * 100).toFixed(1);
    
    console.log(`   ✓ Optimized: ${originalSize} MB → ${optimizedSize} MB (${reduction}% reduction)`);
    
    // Replace original with optimized
    fs.renameSync(outputPath, inputPath);
    console.log(`   ✓ Replaced original with optimized version\n`);
    
  } catch (error) {
    console.error(`   ❌ Failed to optimize ${model}:`, error.message);
  }
});

console.log('✅ Model optimization complete!');
console.log('\n💡 Tip: If models look different, restore originals from _original.glb backups');