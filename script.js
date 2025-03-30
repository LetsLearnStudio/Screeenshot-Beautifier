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

// Undo-Redo functionality
let history = [];
let currentState = -1;

// Initialize canvas
canvas.width = 400;
canvas.height = 300;

function saveState() {
  if (history.length >= 10) history.shift();
  const state = canvas.toDataURL();
  history.push(state);
  currentState = history.length - 1;
}

function undo() {
  if (currentState > 0) {
    currentState--;
    const img = new Image();
    img.src = history[currentState];
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
  }
}

function redo() {
  if (currentState < history.length - 1) {
    currentState++;
    const img = new Image();
    img.src = history[currentState];
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
  }
}

// Image input handling
imageInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      image.src = event.target.result;
      image.onload = () => {
        drawImageWithEffects();
        history = [];
        currentState = -1;
        uploadOverlay.classList.add('hidden');
      };
    };
    reader.readAsDataURL(file);
  }
});

// Drag and drop handling
uploadOverlay.addEventListener('click', () => imageInput.click());

canvasWrapper.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadOverlay.style.backgroundColor = "rgba(0,123,255,0.2)";
});

canvasWrapper.addEventListener('dragleave', (e) => {
  e.preventDefault();
  uploadOverlay.style.backgroundColor = "rgba(255,255,255,0.8)";
});

canvasWrapper.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadOverlay.style.backgroundColor = "rgba(255,255,255,0.8)";
  const file = e.dataTransfer.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      image.src = event.target.result;
      image.onload = () => {
        drawImageWithEffects();
        history = [];
        currentState = -1;
        uploadOverlay.classList.add('hidden');
      };
    };
    reader.readAsDataURL(file);
  }
});

// Event listeners for controls
cornerRadius.addEventListener('input', drawImageWithEffects);
backgroundSizeInput.addEventListener('input', drawImageWithEffects);
bgCornerRadius.addEventListener('input', drawImageWithEffects);
aspectRatio.addEventListener('change', drawImageWithEffects);
color1.addEventListener('input', drawImageWithEffects);
color2.addEventListener('input', drawImageWithEffects);

// Blur mode handling
function toggleBlurMode() {
  isBlurMode = blurToggle.checked;
  document.getElementById("blurIntensityDiv").style.display = isBlurMode ? "flex" : "none";
  document.getElementById("shapeDiv").style.display = isBlurMode ? "flex" : "none";
  if (isBlurMode) saveState();
}

// Main drawing function
function drawImageWithEffects() {
  if (!image.src) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, color1.value);
    gradient.addColorStop(1, color2.value);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const radius = parseInt(cornerRadius.value);
  const bgRadius = parseInt(bgCornerRadius.value);
  const padding = parseInt(backgroundSizeInput.value);
  const selectedAspectRatio = aspectRatio.value;

  let canvasWidth, canvasHeight;
  switch (selectedAspectRatio) {
    case 'square':
      canvasWidth = canvasHeight = Math.max(image.width, image.height);
      break;
    case 'horizontal':
      canvasWidth = Math.max(image.width, (image.height * 16) / 9);
      canvasHeight = (canvasWidth * 9) / 16;
      break;
    case 'vertical':
      canvasHeight = Math.max(image.height, (image.width * 16) / 9);
      canvasWidth = (canvasHeight * 9) / 16;
      break;
    default:
      canvasWidth = image.width;
      canvasHeight = image.height;
  }

  const scaleFactor = 1 + padding / 100;
  canvas.width = canvasWidth * scaleFactor;
  canvas.height = canvasHeight * scaleFactor;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw background
  ctx.save();
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

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, color1.value);
  gradient.addColorStop(1, color2.value);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  // Draw image
  const offsetX = (canvas.width - image.width) / 2;
  const offsetY = (canvas.height - image.height) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(offsetX + radius, offsetY);
  ctx.lineTo(offsetX + image.width - radius, offsetY);
  ctx.arcTo(offsetX + image.width, offsetY, offsetX + image.width, offsetY + radius, radius);
  ctx.lineTo(offsetX + image.width, offsetY + image.height - radius);
  ctx.arcTo(offsetX + image.width, offsetY + image.height, offsetX + image.width - radius, offsetY + image.height, radius);
  ctx.lineTo(offsetX + radius, offsetY + image.height);
  ctx.arcTo(offsetX, offsetY + image.height, offsetX, offsetY + image.height - radius, radius);
  ctx.lineTo(offsetX, offsetY + radius);
  ctx.arcTo(offsetX, offsetY, offsetX + radius, offsetY, radius);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(image, offsetX, offsetY, image.width, image.height);
  ctx.restore();
}

// Blur functionality
canvas.addEventListener('mousedown', (e) => {
  if (isBlurMode) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    startX = (e.clientX - rect.left) * (canvas.width / rect.width);
    startY = (e.clientY - rect.top) * (canvas.height / rect.height);
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (isBlurMode && isDrawing) {
    const rect = canvas.getBoundingClientRect();
    const endX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const endY = (e.clientY - rect.top) * (canvas.height / rect.height);
    applyBlur(startX, startY, endX, endY);
  }
});

canvas.addEventListener('mouseup', () => {
  if (isBlurMode) {
    isDrawing = false;
    saveState();
  }
});

canvas.addEventListener('mouseleave', () => {
  if (isBlurMode) isDrawing = false;
});

function applyBlur(startX, startY, endX, endY) {
  const shape = shapeSelect.value;
  const blurIntensity = parseInt(blurIntensityInput.value);
  ctx.save();
  ctx.beginPath();
  if (shape === 'rectangle') {
    ctx.rect(startX, startY, endX - startX, endY - startY);
  } else {
    const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    ctx.arc(startX, startY, radius, 0, Math.PI * 2);
  }
  ctx.clip();
  ctx.filter = `blur(${blurIntensity}px)`;
  ctx.drawImage(image, (canvas.width - image.width) / 2, (canvas.height - image.height) / 2, image.width, image.height);
  ctx.restore();
}

// Download and reset
function downloadImage() {
  const link = document.createElement('a');
  link.download = 'edited-image.png';
  link.href = canvas.toDataURL();
  link.click();
}

function resetCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  image = new Image();
  uploadOverlay.classList.remove('hidden');
  imageInput.value = '';
  canvas.width = 400;
  canvas.height = 300;
  
  color1.value = "#ff0000";
  color2.value = "#0000ff";
  cornerRadius.value = 0;
  backgroundSizeInput.value = 20;
  aspectRatio.value = "original";
  bgCornerRadius.value = 0;
  blurToggle.checked = false;
  blurIntensityInput.value = 5;
  shapeSelect.value = "rectangle";
  
  document.getElementById("blurIntensityDiv").style.display = "none";
  document.getElementById("shapeDiv").style.display = "none";
  
  history = [];
  currentState = -1;
  drawImageWithEffects();
}
