const fs = require('fs');
const path = require('path');

// Valid 32x32 teal PNG image (properly encoded)
const validPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA7AAAAOwBeShxvQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABVSURBVFiF7dAxDQAwDAOwfehf2nGAIh4gsjTnXO8PAL8HAAfSAC2gBbSAFtACWkALaAEtoAW0gBbQAlpAC2gBLaAFtIAW0AJawKfW3R8AfgO4+wIezQoJuA/8jAAAAABJRU5ErkJggg==';

const assetsDir = path.join(__dirname, '..', 'assets');

const pngBuffer = Buffer.from(validPngBase64, 'base64');

fs.writeFileSync(path.join(assetsDir, 'icon.png'), pngBuffer);
fs.writeFileSync(path.join(assetsDir, 'splash-icon.png'), pngBuffer);
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), pngBuffer);
fs.writeFileSync(path.join(assetsDir, 'favicon.png'), pngBuffer);

console.log('Created valid PNG icons in', assetsDir);
