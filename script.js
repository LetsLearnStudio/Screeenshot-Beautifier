const imageInput = document.getElementById('imageInput');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const color1 = document.getElementById('color1');
const color2 = document.getElementById('color2');
const cornerRadius = document.getElementById('cornerRadius');
const backgroundSizeInput = document.getElementById('backgroundSize');
const aspectRatio = document.getElementById('aspectRatio');
const bgCornerRadius = document.getElementById('bgCornerRadius');
const blurToggle = document.getElementById('blurToggle');
const blurIntensityInput = document.getElementById('blurIntensity');
const shapeSelect = document.getElementById('shape');
const uploadOverlay = document.getElementById('uploadOverlay');
const canvasWrapper = document.getElementById('canvasWrapper');

let image = new Image();
let isBlurMode = false;
let isDrawing = false;
let startX, startY;
let hasAppliedBlur = false; // Flag to track if a blur has been applied in the current action

// Improve startup experience with default gradient
document.addEventListener('DOMContentLoaded', () => {
  drawDefaultGradient();
  
  // Add visual feedback when dragging
  canvasWrapper.addEventListener('dragenter', () => {
    uploadOverlay.classList.add('drag-active');
  });
});

// Undo-Redo functionality
let history = [];
let currentState = -1;
const MAX_HISTORY = 20; // Increase history capacity

// Initialize canvas
canvas.width = 600; // Larger default canvas
canvas.height = 400;

function drawDefaultGradient() {
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, color1.value);
  gradient.addColorStop(1, color2.value);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function saveState() {
  // Add a small delay to prevent performance issues on rapid changes
  setTimeout(() => {
    if (history.length >= MAX_HISTORY) history.shift();
    history = history.slice(0, currentState + 1); // Remove any future states
    const state = canvas.toDataURL();
    history.push(state);
    currentState = history.length - 1;
  }, 0);
}

function undo() {
  if (currentState > 0) {
    currentState--;
    loadState(history[currentState]);
  }
}

function redo() {
  if (currentState < history.length - 1) {
    currentState++;
    loadState(history[currentState]);
  }
}

function loadState(src) {
  const img = new Image();
  img.src = src;
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
}

// Better image input handling
imageInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    handleImageFile(file);
  }
});

function handleImageFile(file) {
  // Show loading indicator
  uploadOverlay.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i><span>Processing image...</span>';
  
  const reader = new FileReader();
  reader.onload = (event) => {
    image = new Image();
    image.src = event.target.result;
    image.onload = () => {
      // Reset canvas to accommodate image size
      resizeCanvasForImage();
      drawImageWithEffects();
      history = [];
      currentState = -1;
      saveState(); // Save initial state
      uploadOverlay.classList.add('hidden');
    };
  };
  reader.readAsDataURL(file);
}

// Resize canvas based on image
function resizeCanvasForImage() {
  const maxWidth = canvasWrapper.clientWidth * 0.9;
  const maxHeight = canvasWrapper.clientHeight * 0.9;
  
  let newWidth = image.width;
  let newHeight = image.height;
  
  // Scale down if image is too large
  if (newWidth > maxWidth) {
    const ratio = maxWidth / newWidth;
    newWidth *= ratio;
    newHeight *= ratio;
  }
  
  if (newHeight > maxHeight) {
    const ratio = maxHeight / newHeight;
    newWidth *= ratio;
    newHeight *= ratio;
  }
  
  canvas.width = newWidth;
  canvas.height = newHeight;
}

// Improved drag and drop handling
uploadOverlay.addEventListener('click', () => imageInput.click());

canvasWrapper.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadOverlay.classList.add('drag-active');
});

canvasWrapper.addEventListener('dragleave', (e) => {
  e.preventDefault();
  uploadOverlay.classList.remove('drag-active');
});

canvasWrapper.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadOverlay.classList.remove('drag-active');
  
  if (e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0];
    if (file.type.match('image.*')) {
      handleImageFile(file);
    } else {
      // Show error message for non-image files
      uploadOverlay.innerHTML = '<i class="fas fa-exclamation-circle"></i><span>Please drop an image file</span>';
      setTimeout(() => {
        uploadOverlay.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><span>Click or drag and drop your image here</span><span class="upload-subtitle">Support JPG, PNG files</span>';
      }, 2000);
    }
  }
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Check if no input elements are focused
  if (document.activeElement === document.body || document.activeElement === canvas) {
    // Ctrl+Z for undo
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      undo();
    }
    // Ctrl+Y for redo
    if (e.ctrlKey && e.key === 'y') {
      e.preventDefault();
      redo();
    }
    // Delete or Backspace to reset
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (confirm('Reset the canvas? All changes will be lost.')) {
        resetCanvas();
      }
    }
  }
});

// Event listeners for controls with debouncing
function debounce(func, delay) {
  let timer;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(context, args), delay);
  };
}

// Apply immediate update for sliders without saving state
const debouncedDrawOnly = debounce(() => {
  drawImageWithEffects(false);
}, 10);

// Apply update and save state after interaction ends
const debouncedDrawAndSave = debounce(() => {
  drawImageWithEffects(true);
}, 300);

// Attach events with different debounce strategies
cornerRadius.addEventListener('input', debouncedDrawOnly);
cornerRadius.addEventListener('change', debouncedDrawAndSave);

backgroundSizeInput.addEventListener('input', debouncedDrawOnly);
backgroundSizeInput.addEventListener('change', debouncedDrawAndSave);

bgCornerRadius.addEventListener('input', debouncedDrawOnly);
bgCornerRadius.addEventListener('change', debouncedDrawAndSave);

aspectRatio.addEventListener('change', () => drawImageWithEffects(true));
color1.addEventListener('input', debouncedDrawOnly);
color1.addEventListener('change', debouncedDrawAndSave);
color2.addEventListener('input', debouncedDrawOnly);
color2.addEventListener('change', debouncedDrawAndSave);

// Blur mode handling with visual feedback
function toggleBlurMode() {
  isBlurMode = blurToggle.checked;
  document.getElementById("blurIntensityDiv").style.display = isBlurMode ? "flex" : "none";
  document.getElementById("shapeDiv").style.display = isBlurMode ? "flex" : "none";
  
  if (isBlurMode) {
    canvas.style.cursor = 'crosshair';
  } else {
    canvas.style.cursor = 'default';
  }
}

// Main drawing function with improved performance
function drawImageWithEffects(saveAfterDraw = true) {
  if (!image.src || !image.complete) {
    // Default gradient if no image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawDefaultGradient();
    return;
  }

  const radius = parseInt(cornerRadius.value);
  const bgRadius = parseInt(bgCornerRadius.value);
  const padding = parseInt(backgroundSizeInput.value);
  const selectedAspectRatio = aspectRatio.value;

  let imgWidth = image.width;
  let imgHeight = image.height;
  let canvasWidth, canvasHeight;
  
  // Calculate dimensions based on aspect ratio
  switch (selectedAspectRatio) {
    case 'square':
      const square = Math.max(imgWidth, imgHeight);
      canvasWidth = canvasHeight = square;
      break;
    case 'horizontal':
      canvasWidth = Math.max(imgWidth, (imgHeight * 16) / 9);
      canvasHeight = (canvasWidth * 9) / 16;
      break;
    case 'vertical':
      canvasHeight = Math.max(imgHeight, (imgWidth * 16) / 9);
      canvasWidth = (canvasHeight * 9) / 16;
      break;
    default: // original
      canvasWidth = imgWidth;
      canvasHeight = imgHeight;
  }

  // Apply padding with scale factor
  const scaleFactor = 1 + padding / 100;
  const paddedWidth = canvasWidth * scaleFactor;
  const paddedHeight = canvasHeight * scaleFactor;
  
  // Only resize the canvas if dimensions have changed
  if (canvas.width !== paddedWidth || canvas.height !== paddedHeight) {
    canvas.width = paddedWidth;
    canvas.height = paddedHeight;
  }
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw background with rounded corners
  ctx.save();
  if (bgRadius > 0) {
    ctx.beginPath();
    ctx.moveTo(bgRadius, 0);
    ctx.lineTo(canvas.width - bgRadius, 0);
    ctx.arcTo(canvas.width, 0, canvas.width, bgRadius, bgRadius);
    ctx.lineTo(canvas.width, canvas.height - bgRadius);
    ctx.arcTo(canvas.width, canvas.height, canvas.width - bgRadius, canvas.height, bgRadius);
    ctx.lineTo(bgRadius, canvas.height);
    ctx.arcTo(0, canvas.height, 0, canvas.height - bgRadius, bgRadius);
    ctx.lineTo(0, bgRadius);
    ctx.arcTo(0, 0, bgRadius, 0, bgRadius);
    ctx.closePath();
    ctx.clip();
  }

  // Improved gradient with better performance
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, color1.value);
  gradient.addColorStop(1, color2.value);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  // Calculate image position
  const offsetX = (canvas.width - imgWidth) / 2;
  const offsetY = (canvas.height - imgHeight) / 2;
  
  // Draw image with rounded corners if needed
  ctx.save();
  if (radius > 0) {
    ctx.beginPath();
    ctx.moveTo(offsetX + radius, offsetY);
    ctx.lineTo(offsetX + imgWidth - radius, offsetY);
    ctx.arcTo(offsetX + imgWidth, offsetY, offsetX + imgWidth, offsetY + radius, radius);
    ctx.lineTo(offsetX + imgWidth, offsetY + imgHeight - radius);
    ctx.arcTo(offsetX + imgWidth, offsetY + imgHeight, offsetX + imgWidth - radius, offsetY + imgHeight, radius);
    ctx.lineTo(offsetX + radius, offsetY + imgHeight);
    ctx.arcTo(offsetX, offsetY + imgHeight, offsetX, offsetY + imgHeight - radius, radius);
    ctx.lineTo(offsetX, offsetY + radius);
    ctx.arcTo(offsetX, offsetY, offsetX + radius, offsetY, radius);
    ctx.closePath();
    ctx.clip();
  }
  
  ctx.drawImage(image, offsetX, offsetY, imgWidth, imgHeight);
  ctx.restore();
  
  // Save state if needed and not in rapid input mode
  if (saveAfterDraw) {
    saveState();
  }
}

// Enhanced blur functionality with fixes for undo/redo
canvas.addEventListener('mousedown', (e) => {
  if (isBlurMode) {
    isDrawing = true;
    hasAppliedBlur = false; // Reset blur applied flag
    const rect = canvas.getBoundingClientRect();
    startX = (e.clientX - rect.left) * (canvas.width / rect.width);
    startY = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    // Save the state before starting to blur, but don't save again until mouseup
    // ONLY if we don't have a saved state yet (initial state)
    if (history.length === 0) {
      saveState();
    }
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (isBlurMode && isDrawing) {
    hasAppliedBlur = true; // Mark that a blur has been applied
    const rect = canvas.getBoundingClientRect();
    const endX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const endY = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    // Throttle blur application for better performance
    requestAnimationFrame(() => {
      applyBlur(startX, startY, endX, endY);
    });
  }
});

canvas.addEventListener('mouseup', () => {
  if (isBlurMode && isDrawing) {
    isDrawing = false;
    
    // Only save state if a blur was actually applied during this action
    if (hasAppliedBlur) {
      saveState(); // Save state only once per complete blur action
      hasAppliedBlur = false; // Reset the flag
    }
  }
});

canvas.addEventListener('mouseleave', () => {
  if (isBlurMode && isDrawing) {
    isDrawing = false;
    
    // Only save state if a blur was actually applied during this action
    if (hasAppliedBlur) {
      saveState();
      hasAppliedBlur = false;
    }
  }
});

function applyBlur(startX, startY, endX, endY) {
  const shape = shapeSelect.value;
  const blurIntensity = parseInt(blurIntensityInput.value);
  
  ctx.save();
  
  // Create clipping path for the blur region
  ctx.beginPath();
  if (shape === 'rectangle') {
    const width = endX - startX;
    const height = endY - startY;
    ctx.rect(
      Math.min(startX, startX + width),
      Math.min(startY, startY + height),
      Math.abs(width),
      Math.abs(height)
    );
  } else { // circle
    const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    ctx.arc(startX, startY, radius, 0, Math.PI * 2);
  }
  ctx.clip();
  
  // Apply blur effect
  ctx.filter = `blur(${blurIntensity}px)`;
  
  // Draw the image on the blurred area
  const offsetX = (canvas.width - image.width) / 2;
  const offsetY = (canvas.height - image.height) / 2;
  ctx.drawImage(image, offsetX, offsetY, image.width, image.height);
  
  ctx.restore();
}

// Download functionality with improved file naming
function downloadImage() {
  const link = document.createElement('a');
  
  // Create a better filename with timestamp
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  link.download = `edited-image-${timestamp}.png`;
  
  // Set quality and get data URL
  link.href = canvas.toDataURL('image/png');
  
  // Trigger download
  link.click();
}

// Enhanced reset with confirmation
function resetCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  image = new Image();
  uploadOverlay.classList.remove('hidden');
  uploadOverlay.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><span>Click or drag and drop your image here</span><span class="upload-subtitle">Support JPG, PNG files</span>';
  
  // Reset input values
  imageInput.value = '';
  canvas.width = 600;
  canvas.height = 400;
  
  // Reset controls to default values
  color1.value = "#3498db";
  color2.value = "#9b59b6";
  cornerRadius.value = 0;
  backgroundSizeInput.value = 20;
  aspectRatio.value = "original";
  bgCornerRadius.value = 0;
  blurToggle.checked = false;
  blurIntensityInput.value = 5;
  shapeSelect.value = "rectangle";
  
  // Hide optional panels
  document.getElementById("blurIntensityDiv").style.display = "none";
  document.getElementById("shapeDiv").style.display = "none";
  
  // Reset cursor
  canvas.style.cursor = 'default';
  
  // Clear history
  history = [];
  currentState = -1;
  
  // Draw default gradient
  drawDefaultGradient();
  saveState();
}
