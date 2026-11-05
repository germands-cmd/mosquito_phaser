/**
 * IconRenderer.js
 * Utility to render ability icons supporting both:
 * 1. Raw SVG strings (e.g. '<svg xmlns=... >...</svg>') rendered crisply as canvas textures
 * 2. Standard text / emoji symbols with high resolution (sharp, non-blurry)
 */

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Converts a raw SVG string into a high-DPI canvas texture in Phaser.
 * @param {Phaser.Scene} scene
 * @param {string} key
 * @param {string} svgString
 * @param {number} width
 * @param {number} height
 * @param {Function} callback
 */
export function registerSvgTexture(scene, key, svgString, width = 64, height = 64, callback = null) {
  if (scene.textures.exists(key)) {
    callback?.(key);
    return;
  }

  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();

  img.onload = () => {
    try {
      const scale = Math.max(2, window.devicePixelRatio || 2);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      if (!scene.textures.exists(key)) {
        scene.textures.addCanvas(key, canvas);
      }
      callback?.(key);
    } catch (err) {
      console.error('Error creating SVG canvas texture:', err);
    }
  };

  img.onerror = (err) => {
    URL.revokeObjectURL(url);
    console.error('Failed to load raw SVG image:', err);
  };

  img.src = url;
}

/**
 * Checks if a symbol string is raw SVG markup.
 * @param {string} symbol
 * @returns {boolean}
 */
export function isSvgMarkup(symbol) {
  return typeof symbol === 'string' && symbol.trim().toLowerCase().startsWith('<svg');
}

/**
 * Renders an ability icon into a container.
 * If raw SVG markup, creates an Image with a dynamically registered high-DPI texture.
 * If text/emoji, creates a Phaser Text object with resolution: 2 to prevent blurriness.
 *
 * @param {Phaser.Scene} scene
 * @param {Phaser.GameObjects.Container} container
 * @param {number} x
 * @param {number} y
 * @param {string} symbol - Raw SVG string or emoji/text
 * @param {number} size - Target display size in pixels
 * @param {string} [idHint=''] - Optional ability ID for texture caching
 * @returns {{ type: 'image'|'text', gameObject: Phaser.GameObjects.GameObject, updateSymbol: Function }}
 */
export function createAbilityIcon(scene, container, x, y, symbol, size = 32, idHint = '') {
  let currentObj = null;

  const updateSymbol = (newSymbol, newIdHint = idHint) => {
    if (currentObj) {
      currentObj.destroy();
      currentObj = null;
    }

    if (!newSymbol) return;

    if (isSvgMarkup(newSymbol)) {
      const textureKey = `svg_icon_${newIdHint || hashCode(newSymbol)}`;
      const img = scene.add.image(x, y, scene.textures.exists(textureKey) ? textureKey : '__DEFAULT');
      img.setDisplaySize(size, size).setOrigin(0.5);

      if (scene.textures.exists(textureKey)) {
        img.setVisible(true);
      } else {
        img.setVisible(false);
        registerSvgTexture(scene, textureKey, newSymbol, size, size, () => {
          if (img && img.scene) {
            img.setTexture(textureKey).setDisplaySize(size, size).setVisible(true);
          }
        });
      }

      container.add(img);
      currentObj = img;
    } else {
      const fontSize = `${Math.round(size * 0.72)}px`;
      const txt = scene.add.text(x, y, newSymbol, {
        fontSize,
        resolution: 2,
      }).setOrigin(0.5);

      container.add(txt);
      currentObj = txt;
    }
  };

  updateSymbol(symbol);

  return {
    get gameObject() {
      return currentObj;
    },
    updateSymbol,
    destroy() {
      if (currentObj) currentObj.destroy();
    }
  };
}
