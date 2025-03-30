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
let hasAppliedBlur = false;
let preBlurState;

// Blur history system
let blurHistory = [];
let blurCurrentState = -1;
const MAX_BLUR_HISTORY = 20;

// Initialize canvas
canvas.width = 600;
canvas.height = 400;

document.addEventListener('DOMContentLoaded', () => {
  drawDefaultGradient();
  
  canvasWrapper.addEventListener('dragenter', () => {
    uploadOverlay.classList.add('drag-active');
  });
});

function drawDefaultGradient() {
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, color1.value);
  gradient.addColorStop(1, color2.value);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function saveBlurState() {
  setTimeout(() => {
    if (blurHistory.length >= MAX_BLUR_HISTORY) blurHistory.shift();
    blurHistory = blurHistory.slice(0, blurCurrentState + 1);
    const state = canvas.toDataURL();
    blurHistory.push(state);
    blurCurrentState = blurHistory.length - 1;
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

function undo() {
  if (blurCurrentState > 0) {
    blurCurrentState--;
    loadBlurState(blurHistory[blurCurrentState]);
  }
  updateUndoRedoButtonStates();
}

function redo() {
  if (blurCurrentState < blurHistory.length - 1) {
    blurCurrentState++;
    loadBlurState(blurHistory[blurCurrentState]);
  }
  updateUndoRedoButtonStates();
}

imageInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    handleImageFile(file);
    blurHistory = [];
    blurCurrentState = -1;
  }
});

function handleImageFile(file) {
  uploadOverlay.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i><span>Processing image...</span>';
  
  const reader = new FileReader();
  reader.onload = (event) => {
    image = new Image();
    image.src = event.target.result;
    image.onload = () => {
      resizeCanvasForImage();
      drawImageWithEffects();
      blurHistory = [];
      blurCurrentState = -1;
      uploadOverlay.classList.add('hidden');
    };
  };
  reader.readAsDataURL(file);
}

function resizeCanvasForImage() {
  const maxWidth = canvasWrapper.clientWidth * 0.9;
  const maxHeight = canvasWrapper.clientHeight * 0.9;
  
  let newWidth = image.width;
  let newHeight = image.height;
  
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
      uploadOverlay.innerHTML = '<i class="fas fa-exclamation-circle"></i><span>Please drop an image file</span>';
      setTimeout(() => {
        uploadOverlay.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><span>Click or drag and drop your image here</span><span class="upload-subtitle">Support JPG, PNG files</span>';
      }, 2000);
    }
  }
});

document.addEventListener('keydown', (e) => {
  if (document.activeElement === document.body || document.activeElement === canvas) {
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      undo();
    }
    if (e.ctrlKey && e.key === 'y') {
      e.preventDefault();
      redo();
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (confirm('Reset the canvas? All changes will be lost.')) {
        resetCanvas();
      }
    }
  }
});

function debounce(func, delay) {
  let timer;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(context, args), delay);
  };
}

const debouncedDrawOnly = debounce(() => {
  drawImageWithEffects(false);
}, 10);

const debouncedDrawAndSave = debounce(() => {
  drawImageWithEffects(true);
}, 300);

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

function toggleBlurMode() {
  isBlurMode = blurToggle.checked;
  document.getElementById("blurIntensityDiv").style.display = isBlurMode ? "flex" : "none";
  document.getElementById("shapeDiv").style.display = isBlurMode ? "flex" : "none";
  
  if (isBlurMode) {
    canvas.style.cursor = 'crosshair';
    if (blurHistory.length === 0) {
      saveBlurState();
    }
  } else {
    canvas.style.cursor = 'default';
  }
}

function drawImageWithEffects(saveAfterDraw = true) {
  if (!image.src || !image.complete) {
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
    default:
      canvasWidth = imgWidth;
      canvasHeight = imgHeight;
  }

  const scaleFactor = 1 + padding / 100;
  const paddedWidth = canvasWidth * scaleFactor;
  const paddedHeight = canvasHeight * scaleFactor;
  
  if (canvas.width !== paddedWidth || canvas.height !== paddedHeight) {
    canvas.width = paddedWidth;
    canvas.height = paddedHeight;
  }
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);

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

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, color1.value);
  gradient.addColorStop(1, color2.value);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  const offsetX = (canvas.width - imgWidth) / 2;
  const offsetY = (canvas.height - imgHeight) / 2;
  
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
}

canvas.addEventListener('mousedown', (e) => {
  if (isBlurMode) {
    isDrawing = true;
    hasAppliedBlur = false;
    const rect = canvas.getBoundingClientRect();
    startX = (e.clientX - rect.left) * (canvas.width / rect.width);
    startY = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    if (blurHistory.length === 0) {
      saveBlurState();
    } else {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(canvas, 0, 0);
      preBlurState = tempCanvas.toDataURL();
    }
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (isBlurMode && isDrawing) {
    const rect = canvas.getBoundingClientRect();
    const endX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const endY = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    applyBlur(startX, startY, endX, endY);
    hasAppliedBlur = true;
  }
});

canvas.addEventListener('mouseup', () => {
  if (isBlurMode && isDrawing) {
    isDrawing = false;
    if (hasAppliedBlur) {
      saveBlurState();
      hasAppliedBlur = false;
    }
  }
});

canvas.addEventListener('mouseleave', () => {
  if (isBlurMode && isDrawing) {
    isDrawing = false;
    if (hasAppliedBlur) {
      saveBlurState();
      hasAppliedBlur = false;
    }
  }
});

function applyBlur(startX, startY, endX, endY) {
  const shape = shapeSelect.value;
  const blurIntensity = parseInt(blurIntensityInput.value);
  
  ctx.save();
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
  } else {
    const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    ctx.arc(startX, startY, radius, 0, Math.PI * 2);
  }
  ctx.clip();
  ctx.filter = `blur(${blurIntensity}px)`;
  const offsetX = (canvas.width - image.width) / 2;
  const offsetY = (canvas.height - image.height) / 2;
  ctx.drawImage(image, offsetX, offsetY, image.width, image.height);
  ctx.restore();
}

function downloadImage() {
  const link = document.createElement('a');
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  link.download = `edited-image-${timestamp}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function resetCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  image = new Image();
  uploadOverlay.classList.remove('hidden');
  uploadOverlay.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><span>Click or drag and drop your image here</span><span class="upload-subtitle">Support JPG, PNG files</span>';
  
  imageInput.value = '';
  canvas.width = 600;
  canvas.height = 400;
  
  color1.value = "#3498db";
  color2.value = "#9b59b6";
  cornerRadius.value = 0;
  backgroundSizeInput.value = 20;
  aspectRatio.value = "original";
  bgCornerRadius.value = 0;
  blurToggle.checked = false;
  blurIntensityInput.value = 5;
  shapeSelect.value = "rectangle";
  
  document.getElementById("blurIntensityDiv").style.display = "none";
  document.getElementById("shapeDiv").style.display = "none";
  
  canvas.style.cursor = 'default';
  
  blurHistory = [];
  blurCurrentState = -1;
  
  drawDefaultGradient();
  updateUndoRedoButtonStates();
}
