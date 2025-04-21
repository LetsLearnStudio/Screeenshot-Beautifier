// DOM elements for padding normalization
const normalizeToggle = document.getElementById('normalizeToggle');
const normalizationControls = document.getElementById('normalizationControls');
const paddingAmount = document.getElementById('paddingAmount');
const paddingTopElement = document.getElementById('paddingTop');
const paddingRightElement = document.getElementById('paddingRight');
const paddingBottomElement = document.getElementById('paddingBottom');
const paddingLeftElement = document.getElementById('paddingLeft');

// Padding detection and normalization variables
let isNormalizeMode = false;
let originalImage = null;
let detectedPadding = { top: 0, right: 0, bottom: 0, left: 0 };
let paddingColor = { r: 255, g: 255, b: 255 }; // Default white

// Event listeners for normalization controls
normalizeToggle.addEventListener('change', toggleNormalizeMode);
paddingAmount.addEventListener('input', updateNormalizedImage);

// Store the original image whenever a new image is loaded
// This is crucial for proper padding normalization functionality
function storeOriginalImage() {
  if (image && image.src) {
    originalImage = new Image();
    originalImage.crossOrigin = "Anonymous";
    originalImage.onload = function() {
      // Only detect padding if normalize mode is enabled
      if (isNormalizeMode) {
        detectImagePadding();
      }
    };
    originalImage.src = image.src;
  }
}

// Override the image onload handler to capture the original image
const originalImageOnLoad = image.onload;
image.onload = function() {
  // Store the original image first
  storeOriginalImage();
  
  // Then run the original onload handler if it exists
  if (typeof originalImageOnLoad === 'function') {
    originalImageOnLoad.call(image);
  }
};

// Toggle the normalization mode on/off
function toggleNormalizeMode() {
  isNormalizeMode = normalizeToggle.checked;
  
  // Show/hide the normalization controls
  normalizationControls.style.display = isNormalizeMode ? 'block' : 'none';
  
  if (isNormalizeMode) {
    // If we already have an image, detect its padding
    if (image.src) {
      if (!originalImage || originalImage.src !== image.src) {
        storeOriginalImage();
      } else {
        detectImagePadding();
      }
    }
  } else {
    // Reset to original rendering without normalization
    if (image.src && originalImage && originalImage.src) {
      image.src = originalImage.src;
    }
  }
}

// Detect padding in the uploaded image
function detectImagePadding() {
  if (!originalImage || !originalImage.complete) {
    console.log("Original image not loaded yet");
    setTimeout(detectImagePadding, 100);
    return;
  }
  
  // Create a temporary canvas to analyze the original image
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  tempCanvas.width = originalImage.width;
  tempCanvas.height = originalImage.height;
  tempCtx.drawImage(originalImage, 0, 0);
  
  try {
    // Get image data for analysis
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    
    // Find boundaries (top, right, bottom, left)
    let top = tempCanvas.height;
    let right = 0;
    let bottom = 0;
    let left = tempCanvas.width;
    
    // Threshold for what's considered "padding" (allowing some noise)
    const threshold = 30;
    
    // Scan the image to find content boundaries
    for (let y = 0; y < tempCanvas.height; y++) {
      for (let x = 0; x < tempCanvas.width; x++) {
        const index = (y * tempCanvas.width + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const a = data[index + 3];
        
        // Skip transparent pixels
        if (a < 250) continue;
        
        // Check if pixel is part of content using color variance
        const intensity = (r + g + b) / 3;
        const variance = Math.sqrt(
          (r - intensity) * (r - intensity) +
          (g - intensity) * (g - intensity) +
          (b - intensity) * (b - intensity)
        );
        
        if (variance > threshold || intensity < 240) {
          top = Math.min(top, y);
          right = Math.max(right, x);
          bottom = Math.max(bottom, y);
          left = Math.min(left, x);
        }
      }
    }
    
    // Calculate padding values
    detectedPadding = {
      top: top,
      right: tempCanvas.width - right - 1,
      bottom: tempCanvas.height - bottom - 1,
      left: left
    };
    
    // Detect padding color
    paddingColor = detectPaddingColor(tempCtx, tempCanvas.width, tempCanvas.height, detectedPadding);
    
    // Update the UI with detected padding values
    updatePaddingDisplay();
    
    // Apply padding normalization
    updateNormalizedImage();
  } catch (error) {
    console.error("Error detecting padding:", error);
  }
}

// Detect the color of existing padding
function detectPaddingColor(ctx, width, height, padding) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // Check if there is any significant padding
  const hasPadding = 
    padding.top > 5 || 
    padding.right > 5 || 
    padding.bottom > 5 || 
    padding.left > 5;
  
  if (!hasPadding) {
    // No significant padding, default to white
    return { r: 255, g: 255, b: 255 };
  }
  
  // Sample areas from existing padding
  const paddingSamples = [];
  
  // Sample top padding if it exists
  if (padding.top > 5) {
    const y = Math.floor(padding.top / 2);
    for (let x = 0; x < width; x += 5) { // Sample every 5 pixels
      const index = (y * width + x) * 4;
      if (data[index + 3] > 250) { // Not transparent
        paddingSamples.push({
          r: data[index],
          g: data[index + 1],
          b: data[index + 2]
        });
      }
    }
  }
  
  // Sample bottom padding if it exists
  if (padding.bottom > 5) {
    const y = height - Math.floor(padding.bottom / 2) - 1;
    for (let x = 0; x < width; x += 5) {
      const index = (y * width + x) * 4;
      if (data[index + 3] > 250) {
        paddingSamples.push({
          r: data[index],
          g: data[index + 1],
          b: data[index + 2]
        });
      }
    }
  }
  
  // Sample left padding if it exists
  if (padding.left > 5) {
    const x = Math.floor(padding.left / 2);
    for (let y = 0; y < height; y += 5) {
      const index = (y * width + x) * 4;
      if (data[index + 3] > 250) {
        paddingSamples.push({
          r: data[index],
          g: data[index + 1],
          b: data[index + 2]
        });
      }
    }
  }
  
  // Sample right padding if it exists
  if (padding.right > 5) {
    const x = width - Math.floor(padding.right / 2) - 1;
    for (let y = 0; y < height; y += 5) {
      const index = (y * width + x) * 4;
      if (data[index + 3] > 250) {
        paddingSamples.push({
          r: data[index],
          g: data[index + 1],
          b: data[index + 2]
        });
      }
    }
  }
  
  // If we have valid samples, calculate average color
  if (paddingSamples.length > 0) {
    let totalR = 0, totalG = 0, totalB = 0;
    for (const sample of paddingSamples) {
      totalR += sample.r;
      totalG += sample.g;
      totalB += sample.b;
    }
    
    return {
      r: Math.round(totalR / paddingSamples.length),
      g: Math.round(totalG / paddingSamples.length),
      b: Math.round(totalB / paddingSamples.length)
    };
  }
  
  // Default to white if no valid samples
  return { r: 255, g: 255, b: 255 };
}

// Update the padding display in the UI
function updatePaddingDisplay() {
  paddingTopElement.textContent = detectedPadding.top;
  paddingRightElement.textContent = detectedPadding.right;
  paddingBottomElement.textContent = detectedPadding.bottom;
  paddingLeftElement.textContent = detectedPadding.left;
}

// Apply padding normalization and update the image display
function updateNormalizedImage() {
  if (!isNormalizeMode || !originalImage || !originalImage.complete) return;
  
  try {
    // Calculate content dimensions (without padding)
    const contentWidth = originalImage.width - detectedPadding.left - detectedPadding.right;
    const contentHeight = originalImage.height - detectedPadding.top - detectedPadding.bottom;
    
    // Get the normalized padding value from the slider
    const normalizedPadding = parseInt(paddingAmount.value);
    
    // Create a temporary canvas for the normalized image
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    // Set the dimensions for the normalized image
    tempCanvas.width = contentWidth + (normalizedPadding * 2);
    tempCanvas.height = contentHeight + (normalizedPadding * 2);
    
    // Draw background with detected padding color
    tempCtx.fillStyle = `rgb(${paddingColor.r}, ${paddingColor.g}, ${paddingColor.b})`;
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Draw the content portion of the image with normalized padding
    tempCtx.drawImage(
      originalImage,
      detectedPadding.left, detectedPadding.top, contentWidth, contentHeight, // Source (content only)
      normalizedPadding, normalizedPadding, contentWidth, contentHeight // Destination
    );
    
    // Update the main image with the normalized version
    const newImage = new Image();
    newImage.onload = function() {
      image.src = newImage.src;
      drawImageWithEffects();
    };
    newImage.src = tempCanvas.toDataURL('image/png');
  } catch (error) {
    console.error("Error normalizing image:", error);
  }
}

// Hook into relevant image loading functions
// Make sure we capture image.src changes from other parts of the app
const originalDrawImageWithEffects = window.drawImageWithEffects;
window.drawImageWithEffects = function() {
  // Call the original function to apply all other effects
  originalDrawImageWithEffects.call(window);
};

// Hook into imageInput event listener to capture new images
const originalImageInputListener = imageInput.onchange;
imageInput.onchange = function(e) {
  // Reset normalization when a new image is loaded
  if (isNormalizeMode) {
    normalizeToggle.checked = false;
    isNormalizeMode = false;
    normalizationControls.style.display = 'none';
  }
  
  // Call the original handler if it exists
  if (typeof originalImageInputListener === 'function') {
    originalImageInputListener.call(this, e);
  }
};

// Listen for dragdrop events to store the original image
canvasWrapper.addEventListener('drop', function(e) {
  setTimeout(storeOriginalImage, 500);
});