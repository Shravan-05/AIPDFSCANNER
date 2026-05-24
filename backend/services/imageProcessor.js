const sharp = require('sharp');
const path = require('path');

exports.detectDocumentEdges = async (imagePath) => {
  try {
    const metadata = await sharp(imagePath).metadata();
    const { width, height } = metadata;
    const trimmed = await sharp(imagePath)
      .grayscale()
      .normalize()
      .trim(20)
      .toBuffer({ resolveWithObject: true });
    const { info } = trimmed;
    const trimmedW = info.width;
    const trimmedH = info.height;
    if (trimmedW >= width && trimmedH >= height) return null;
    const left = Math.round((width - trimmedW) / 2);
    const top = Math.round((height - trimmedH) / 2);
    const padding = 10;
    return {
      x1: Math.max(0, left - padding),
      y1: Math.max(0, top - padding),
      x2: Math.min(width, left + trimmedW + padding),
      y2: Math.min(height, top + trimmedH + padding)
    };
  } catch (err) {
    console.error('Edge detection error:', err);
    return null;
  }
};

exports.autoCrop = async (imagePath, edges) => {
  try {
    const { x1, y1, x2, y2 } = edges;
    const outputPath = imagePath.replace(/(\.[\w]+)$/, '_cropped$1');
    await sharp(imagePath)
      .extract({ left: Math.round(x1), top: Math.round(y1), width: Math.round(x2 - x1), height: Math.round(y2 - y1) })
      .toFile(outputPath);
    return outputPath;
  } catch (err) {
    console.error('Auto crop error:', err);
    return imagePath;
  }
};

exports.perspectiveCorrect = async (imagePath) => {
  try {
    const metadata = await sharp(imagePath).metadata();
    const angle = await exports.detectOrientation(imagePath);
    if (Math.abs(angle) < 1) return imagePath;
    const outputPath = imagePath.replace(/(\.[\w]+)$/, '_deskewed$1');
    await sharp(imagePath)
      .rotate(angle, { background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .toFile(outputPath);
    return outputPath;
  } catch (err) {
    console.error('Perspective correction error:', err);
    return imagePath;
  }
};

exports.enhance = async (imagePath, options = {}) => {
  try {
    const { brightness = 1.0, contrast = 1.0, sharpness = 1.0, shadowReduction = false } = options;
    let pipeline = sharp(imagePath);
    if (brightness !== 1.0 || contrast !== 1.0) {
      pipeline = pipeline.linear(contrast, (1 - contrast) * 128 + (brightness - 1) * 128);
    }
    if (sharpness > 1.0) {
      pipeline = pipeline.sharpen(sharpness);
    }
    if (shadowReduction) {
      pipeline = pipeline.gamma(2.2).modulate({ brightness: 1.1 }).gamma(0.45);
    }
    const outputPath = imagePath.replace(/(\.[\w]+)$/, '_enhanced$1');
    await pipeline.toFile(outputPath);
    return outputPath;
  } catch (err) {
    console.error('Enhance error:', err);
    return imagePath;
  }
};

exports.convertMode = async (imagePath, mode) => {
  try {
    const outputPath = imagePath.replace(/(\.[\w]+)$/, `_${mode}$1`);
    let pipeline = sharp(imagePath);
    if (mode === 'grayscale') {
      pipeline = pipeline.grayscale();
    } else if (mode === 'blackwhite') {
      pipeline = pipeline.grayscale().threshold(128);
    }
    await pipeline.toFile(outputPath);
    return outputPath;
  } catch (err) {
    console.error('Convert mode error:', err);
    return imagePath;
  }
};

exports.generateThumbnail = async (imagePath) => {
  try {
    const thumbPath = imagePath.replace(/(\.[\w]+)$/, '_thumb$1');
    await sharp(imagePath)
      .resize(300, 200, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 70 })
      .toFile(thumbPath);
    return thumbPath;
  } catch (err) {
    console.error('Thumbnail error:', err);
    return imagePath;
  }
};

exports.detectOrientation = async (imagePath) => {
  return 0; // The custom heuristic was incorrectly rotating images. We now rely on EXIF.
};

exports.processImage = async (imagePath, options = {}) => {
  try {
    await sharp(imagePath).metadata();

    const { autoCropEnabled = true, enhanceEnabled = true, scanMode = 'color' } = options;
    const ext = path.extname(imagePath);
    const base = imagePath.replace(ext, '');
    const processedPath = `${base}_processed.jpg`;
    const thumbnailPath = `${base}_thumb.jpg`;

    let pipeline = sharp(imagePath).rotate();

    if (autoCropEnabled) {
      const edges = await exports.detectDocumentEdges(imagePath);
      if (edges) {
        pipeline = sharp(imagePath).rotate().extract({
          left: Math.round(edges.x1),
          top: Math.round(edges.y1),
          width: Math.round(edges.x2 - edges.x1),
          height: Math.round(edges.y2 - edges.y1)
        });
      }
    }

    if (enhanceEnabled) {
      const { brightness = 1.0, contrast = 1.0, sharpness = 1.0 } = options;
      if (contrast !== 1.0 || brightness !== 1.0) {
        pipeline = pipeline.linear(contrast, (1 - contrast) * 128 + (brightness - 1) * 128);
      }
      if (sharpness > 1.0) {
        pipeline = pipeline.sharpen(sharpness);
      }
    }

    if (scanMode === 'grayscale') {
      pipeline = pipeline.grayscale();
    } else if (scanMode === 'blackwhite') {
      pipeline = pipeline.grayscale().threshold(128);
    }

    await pipeline.jpeg({ quality: 85 }).toFile(processedPath);

    await sharp(processedPath)
      .resize(300, 200, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 70 })
      .toFile(thumbnailPath);

    return { processedPath, thumbnailPath };
  } catch (err) {
    console.error('Process image error:', err);
    throw err;
  }
};

exports.processImageCustom = async (originalPath, options = {}) => {
  try {
    const { cropCoordinates, enhancement = {}, scanMode = 'color' } = options;
    const { brightness = 1.0, contrast = 1.0, sharpness = 1.0 } = enhancement;
    
    let pipeline = sharp(originalPath);
    
    // 1. Crop if coordinates provided
    if (cropCoordinates && cropCoordinates.x1 !== undefined && cropCoordinates.x2 !== undefined) {
      const { x1, y1, x2, y2, isPercentage = true } = cropCoordinates;
      const metadata = await sharp(originalPath).metadata();
      
      let left, top, width, height;
      if (isPercentage) {
        left = Math.max(0, Math.round((x1 / 100) * metadata.width));
        top = Math.max(0, Math.round((y1 / 100) * metadata.height));
        const right = Math.min(metadata.width, Math.round((x2 / 100) * metadata.width));
        const bottom = Math.min(metadata.height, Math.round((y2 / 100) * metadata.height));
        width = right - left;
        height = bottom - top;
      } else {
        left = Math.max(0, Math.round(x1));
        top = Math.max(0, Math.round(y1));
        width = Math.min(metadata.width - left, Math.round(x2 - x1));
        height = Math.min(metadata.height - top, Math.round(y2 - y1));
      }
      
      if (width > 0 && height > 0) {
        pipeline = pipeline.extract({ left, top, width, height });
      }
    }
    
    // 2. Enhance (brightness, contrast)
    if (contrast !== 1.0 || brightness !== 1.0) {
      pipeline = pipeline.linear(contrast, (1 - contrast) * 128 + (brightness - 1) * 128);
    }
    if (sharpness > 1.0) {
      pipeline = pipeline.sharpen(sharpness);
    }
    
    // 3. Scan Mode (grayscale, blackwhite, color)
    if (scanMode === 'grayscale') {
      pipeline = pipeline.grayscale();
    } else if (scanMode === 'blackwhite') {
      pipeline = pipeline.grayscale().threshold(128);
    }
    
    // Generate unique file path
    const ext = path.extname(originalPath);
    const base = originalPath.replace(ext, '');
    const processedPath = `${base}_custom_${Date.now()}.jpg`;
    
    await pipeline.toFile(processedPath);
    
    // 4. Generate thumbnail
    const thumbnailPath = processedPath.replace(/\.jpg$/i, `_thumb.jpg`);
    await sharp(processedPath)
      .resize(300, 200, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 70 })
      .toFile(thumbnailPath);
      
    return { processedPath, thumbnailPath };
  } catch (err) {
    console.error('Process image custom error:', err);
    throw err;
  }
};

exports.applyAnnotation = async (originalPath, annotationPath) => {
  try {
    const ext = path.extname(originalPath);
    const base = originalPath.replace(ext, '');
    const compositedPath = `${base}_annotated_${Date.now()}.jpg`;

    // Ensure we account for EXIF rotation by forcing auto-rotation before getting metadata
    const baseImage = sharp(originalPath).rotate();
    const metadata = await baseImage.metadata();

    // The annotation layer is from a web canvas, we need to resize it to match the *oriented* original image exactly
    const resizedAnnotation = await sharp(annotationPath)
      .resize(metadata.width, metadata.height, { fit: 'fill' })
      .toBuffer();

    await baseImage
      .composite([{ input: resizedAnnotation }])
      .toFile(compositedPath);

    const thumbnailPath = compositedPath.replace(/\.jpg$/i, `_thumb.jpg`);
    await sharp(compositedPath)
      .resize(300, 200, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 70 })
      .toFile(thumbnailPath);

    return { processedPath: compositedPath, thumbnailPath };
  } catch (err) {
    console.error('Apply annotation error:', err);
    throw err;
  }
};
