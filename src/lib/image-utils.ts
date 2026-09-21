export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // needed to avoid cross-origin issues on CodeSandbox
    image.src = url;
  });

export function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the new bounding area of a rotated rectangle.
 */
export function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

/**
 * Applies a basic sharpen convolution filter to a canvas context.
 */
function applySharpen(ctx: CanvasRenderingContext2D, width: number, height: number, amount: number = 0.15) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const copy = new Uint8ClampedArray(data);
  
  // Convolution kernel for sharpening
  // [  0, -1,  0 ]
  // [ -1,  5, -1 ]
  // [  0, -1,  0 ]
  // We use a weighted version to control 'amount'
  const mix = amount;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) { // RGB channels
        const i = idx + c;
        const val = 5 * copy[i] 
                  - copy[i - 4] 
                  - copy[i + 4] 
                  - copy[i - width * 4] 
                  - copy[i + width * 4];
        
        // Blend original with sharpened version based on amount
        data[i] = copy[i] * (1 - mix) + val * mix;
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

/**
 * This function was adapted from the one in the react-easy-crop project.
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0,
  flip = { horizontal: false, vertical: false },
  targetWidth = 800, // Default target width for 1:1 article images
  sharpenAmount = 0.15, // Optional sharpen amount (0 to 1)
  format: 'image/jpeg' | 'image/webp' = 'image/jpeg',
  quality = 0.92,
  forceHeight?: number // Optional forced height
): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  const rotRad = getRadianAngle(rotation);

  // calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  );

  // set canvas size to match the bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // translate canvas context to a central point to allow rotating and flipping around the center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);

  // draw rotated image
  ctx.drawImage(image, 0, 0);

  const croppedCanvas = document.createElement('canvas');
  const croppedCtx = croppedCanvas.getContext('2d', { alpha: false });

  if (!croppedCtx) {
    return null;
  }

  // Calculate the target height based on crop ratio or use forced height
  const cropRatio = pixelCrop.width / pixelCrop.height;
  const targetHeight = forceHeight || (targetWidth / (cropRatio || 1));

  // Set the size of the cropped canvas
  croppedCanvas.width = targetWidth;
  croppedCanvas.height = targetHeight;

  // Use high quality image smoothing
  croppedCtx.imageSmoothingEnabled = true;
  croppedCtx.imageSmoothingQuality = 'high';

  // Draw the cropped image onto the new canvas
  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  // Apply optional sharpening to enhance details after downscaling
  if (sharpenAmount > 0) {
    applySharpen(croppedCtx, targetWidth, targetHeight, sharpenAmount);
  }

  // Export with specified format and quality
  return new Promise((resolve, reject) => {
    croppedCanvas.toBlob((file) => {
      if (file) {
        resolve(file);
      } else {
        reject(new Error('Canvas is empty'));
      }
    }, format, quality);
  });
}

