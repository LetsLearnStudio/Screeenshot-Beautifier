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
let preBlurState; // Added to store state before blur begins

// Improve startup experience with default gradient
document.addEventListener('DOMContentLoaded', () => {
  drawDefaultGradient();
  
  // Add visual feedback when dragging
  canvasWrapper.addEventListener('dragenter', () => {
    uploadOverlay.classList.add('drag-active');
  });

  // Initialize blur mode based on toggle state
  toggleBlurMode();
});

// Replace original undo-redo with blur-specific history system
let blurHistory = [];
let blurCurrentState = -1;
const MAX_BLUR_HISTORY = 20;

function saveBlurState() {
  // Add a small delay to prevent performance issues
  setTimeout(() => {
    if (blurHistory.length >= MAX_BLUR_HISTORY) blurHistory.shift();
    blurHistory = blurHistory.slice(0, blurCurrentState + 1); // Remove any future states
    const state = canvas.toDataURL();
    blurHistory.push(state);
    blurCurrentState = blurHistory.length - 1;
    
    // Update UI to reflect state
    updateUndoRedoButtonStates();
  }, 0);
}

function loadBlurState(src) {
  const img = new Image();
  img.src = src;
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
}

function updateUndoRedoButtonStates() {
  // Add visual feedback for button states
  const undoButton = document.querySelector('button[onclick="undo()"]');
  const redoButton = document.querySelector('button[onclick="redo()"]');
  
  if (undoButton) {
    undoButton.disabled = blurCurrentState <= 0;
    undoButton.style.opacity = blurCurrentState <= 0 ? "0.5" : "1";
  }
  
  if (redoButton) {
    redoButton.disabled = blurCurrentState >= blurHistory.length - 1;
    redoButton.style.opacity = blurCurrentState >= blurHistory.length - 1 ? "0.5" : "1";
  }
}

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

// Updated undo function to use blur history
function undo() {
  if (blurCurrentState > 0) {
    blurCurrentState--;
    loadBlurState(blurHistory[blurCurrentState]);
  }
}

// Updated redo function to use blur history
function redo() {
  if (blurCurrentState < blurHistory.length - 1) {
    blurCurrentState++;
    loadBlurState(blurHistory[blurCurrentState]);
  }
}

// Better image input handling
imageInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    handleImageFile(file);
    // Reset blur history when loading a new image
    blurHistory = [];
    blurCurrentState = -1;
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
      blurHistory = []; // Reset blur history
      blurCurrentState = -1;
      saveBlurState(); // Save initial state
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

// Blur mode toggle handling with visual feedback
blurToggle.addEventListener('change', toggleBlurMode);

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

// Updated drawImageWithEffects to NOT save to blur history
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
  
  if (saveAfterDraw && image.src) {
    // Only save state if we have an image and are requested to save
    saveBlurState();
  }
}

// Updated mousedown event listener for blur
canvas.addEventListener('mousedown', (e) => {
  if (isBlurMode) {
    isDrawing = true;
    hasAppliedBlur = false; // Reset blur applied flag
    const rect = canvas.getBoundingClientRect();
    startX = (e.clientX - rect.left) * (canvas.width / rect.width);
    startY = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    // Take a snapshot before starting to blur
    if (blurHistory.length === 0) {
      saveBlurState();
    } else {
      // Create a temporary canvas to store the current state
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(canvas, 0, 0);
      
      // Store this as the pre-blur state to use if needed
      preBlurState = tempCanvas.toDataURL();
    }
  }
});

// ADDED: mousemove event listener for blur tool
canvas.addEventListener('mousemove', (e) => {
  if (isBlurMode && isDrawing) {
    const rect = canvas.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const currentY = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    // Load the pre-blur state before applying a new blur
    if (preBlurState) {
      const img = new Image();
      img.src = preBlurState;
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        // Apply the blur effect
        applyBlur(startX, startY, currentX, currentY);
        hasAppliedBlur = true; // Mark that we've applied a blur
      };
    } else {
      // If no pre-blur state, just apply the blur directly
      applyBlur(startX, startY, currentX, currentY);
      hasAppliedBlur = true; // Mark that we've applied a blur
    }
  }
});

// Updated mouseup event listener for blur
canvas.addEventListener('mouseup', () => {
  if (isBlurMode && isDrawing) {
    isDrawing = false;
    
    // Only save state if a blur was actually applied during this action
    if (hasAppliedBlur) {
      saveBlurState(); // Save state only once per complete blur action
      hasAppliedBlur = false; // Reset the flag
      preBlurState = null; // Clear the pre-blur state
    }
  }
});

// Updated mouseleave event listener for blur
canvas.addEventListener('mouseleave', () => {
  if (isBlurMode && isDrawing) {
    isDrawing = false;
    
    // Only save state if a blur was actually applied during this action
    if (hasAppliedBlur) {
      saveBlurState();
      hasAppliedBlur = false;
      preBlurState = null; // Clear the pre-blur state
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
  
  // First, get the entire canvas content
  const originalImage = new Image();
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(canvas, 0, 0);
  originalImage.src = tempCanvas.toDataURL();
  
  // Draw the blurred content
  ctx.drawImage(originalImage, 0, 0);
  
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

// Updated resetCanvas function to handle blur history
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
  
  // Clear blur history
  blurHistory = [];
  blurCurrentState = -1;
  
  // Draw default gradient
  drawDefaultGradient();
  saveBlurState();
  
  // Update UI to reflect state
  updateUndoRedoButtonStates();
}
