// Core DOM elements
const imageInput = document.getElementById('imageInput');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const uploadOverlay = document.getElementById('uploadOverlay');
const canvasWrapper = document.getElementById('canvasWrapper');
const aspectRatio = document.getElementById('aspectRatio');
const cornerRadius = document.getElementById('cornerRadius');
const backgroundSizeInput = document.getElementById('backgroundSize');
const bgCornerRadius = document.getElementById('bgCornerRadius');
const shadowIntensity = document.getElementById('shadowIntensity');
const cropIntensity = document.getElementById('cropIntensity');

// Global state variables
let image = new Image();
let isBlurMode = false;
let blurObjects = [];
let selectedBlur = null;

// Initialize canvas
canvas.width = 400;
canvas.height = 300;

// Image handling
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

uploadOverlay.addEventListener('click', () => imageInput.click());

// Drag and drop handling
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

// Core image rendering function
function drawImageWithEffects() {
  if (!image.src) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let gradient;
    if (document.getElementById('gradientType').value === 'radial') {
      const centerX = canvas.width/2;
      const centerY = canvas.height/2;
      const radius = Math.max(canvas.width, canvas.height)/2;
      gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    } else {
      gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    }
    gradient.addColorStop(0, document.getElementById('color1').value);
    gradient.addColorStop(1, document.getElementById('color2').value);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const radius = parseInt(cornerRadius.value);
  const bgRadius = parseInt(bgCornerRadius.value);
  const backgroundSize = parseInt(backgroundSizeInput.value);
  const selectedAspectRatio = aspectRatio.value;
  const shadowValue = parseInt(shadowIntensity.value);
  const cropPercent = parseInt(cropIntensity.value);

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

  const scaleFactor = 1 + backgroundSize / 100;
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

  let gradient;
  if (document.getElementById('gradientType').value === 'radial') {
    const centerX = canvas.width/2;
    const centerY = canvas.height/2;
    const radius = Math.max(canvas.width, canvas.height)/2;
    gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  } else {
    gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  }
  gradient.addColorStop(0, document.getElementById('color1').value);
  gradient.addColorStop(1, document.getElementById('color2').value);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  // Calculate image position
  const offsetX = (canvas.width - image.width) / 2;
  const offsetY = (canvas.height - image.height) / 2;

  // Calculate crop dimensions
  const cropWidth = (cropPercent / 100) * image.width;
  const cropHeight = (cropPercent / 100) * image.height;
  const sourceWidth = image.width - 2 * cropWidth;
  const sourceHeight = image.height - 2 * cropHeight;

  // Draw shadow
  if (shadowValue > 0) {
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

    ctx.shadowColor = `rgba(0, 0, 0, ${Math.min(shadowValue / 30, 0.7)})`;
    ctx.shadowBlur = shadowValue;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.restore();
  }

  // Draw image with cropping
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
  
  ctx.drawImage(
    image,
    cropWidth, // source X
    cropHeight, // source Y
    sourceWidth, // source width
    sourceHeight, // source height
    offsetX, // destination X
    offsetY, // destination Y
    image.width, // destination width
    image.height // destination height
  );
  
  ctx.restore();
  
  if (isBlurMode) {
    setTimeout(drawAllBlurs, 0);
  }
}

// Event listeners for core controls
cornerRadius.addEventListener('input', drawImageWithEffects);
backgroundSizeInput.addEventListener('input', drawImageWithEffects);
bgCornerRadius.addEventListener('input', drawImageWithEffects);
aspectRatio.addEventListener('change', drawImageWithEffects);
shadowIntensity.addEventListener('input', drawImageWithEffects);
cropIntensity.addEventListener('input', drawImageWithEffects);