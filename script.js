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
const shadowIntensity = document.getElementById('shadowIntensity');
const gradientType = document.getElementById('gradientType');
const cropIntensity = document.getElementById('cropIntensity');

let image = new Image();
let isBlurMode = false;
let isDrawing = false;
let startX, startY;
let blurObjects = [];
let selectedBlur = null;
let dragStartX, dragStartY;
let resizing = false;
let resizeHandle = null;

let history = [];
let currentState = -1;

canvas.width = 400;
canvas.height = 300;

function randomizeColors() {
  // Color harmony logic from gradient generator
  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
      const k = (n + h/30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  function generateHarmonizedColors() {
    const baseHue = getRandomInt(0, 360);
    const schemes = [
      // Complementary
      () => {
        return [
          { h: baseHue, s: getRandomInt(60, 90), l: getRandomInt(30, 60) },
          { h: (baseHue + 180) % 360, s: getRandomInt(60, 90), l: getRandomInt(30, 60) }
        ];
      },
      // Analogous
      () => {
        return [
          { h: (baseHue - 30 + 360) % 360, s: getRandomInt(60, 90), l: getRandomInt(30, 60) },
          { h: baseHue, s: getRandomInt(60, 90), l: getRandomInt(30, 60) }
        ];
      },
      // Triadic
      () => {
        return [
          { h: baseHue, s: getRandomInt(60, 90), l: getRandomInt(30, 60) },
          { h: (baseHue + 120) % 360, s: getRandomInt(60, 90), l: getRandomInt(30, 60) }
        ];
      }
    ];
    return schemes[getRandomInt(0, schemes.length - 1)]();
  }

  // Generate and apply colors
  const [color1HSL, color2HSL] = generateHarmonizedColors();
  color1.value = hslToHex(color1HSL.h, color1HSL.s, color1HSL.l);
  color2.value = hslToHex(color2HSL.h, color2HSL.s, color2HSL.l);
  
  // Keep the user's selected gradient type (don't randomize it)
  drawImageWithEffects();
}

function flipColors() {
  const temp = color1.value;
  color1.value = color2.value;
  color2.value = temp;
  drawImageWithEffects();
}

function saveState() {
  if (history.length >= 10) history.shift();
  const state = {
    canvasData: canvas.toDataURL(),
    blurObjects: JSON.parse(JSON.stringify(blurObjects))
  };
  history.push(state);
  currentState = history.length - 1;
}

function undo() {
  if (currentState > 0) {
    currentState--;
    const state = history[currentState];
    const img = new Image();
    img.src = state.canvasData;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      blurObjects = JSON.parse(JSON.stringify(state.blurObjects));
      drawAllBlurs();
    };
  }
}

function redo() {
  if (currentState < history.length - 1) {
    currentState++;
    const state = history[currentState];
    const img = new Image();
    img.src = state.canvasData;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      blurObjects = JSON.parse(JSON.stringify(state.blurObjects));
      drawAllBlurs();
    };
  }
}

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

cornerRadius.addEventListener('input', drawImageWithEffects);
backgroundSizeInput.addEventListener('input', drawImageWithEffects);
bgCornerRadius.addEventListener('input', drawImageWithEffects);
aspectRatio.addEventListener('change', drawImageWithEffects);
color1.addEventListener('input', drawImageWithEffects);
color2.addEventListener('input', drawImageWithEffects);
shadowIntensity.addEventListener('input', drawImageWithEffects);
gradientType.addEventListener('change', drawImageWithEffects);
cropIntensity.addEventListener('input', drawImageWithEffects);

function toggleBlurMode() {
  isBlurMode = blurToggle.checked;
  document.getElementById("blurIntensityDiv").style.display = isBlurMode ? "flex" : "none";
  document.getElementById("shapeDiv").style.display = isBlurMode ? "flex" : "none";
  
  if (isBlurMode) {
    saveState();
    drawAllBlurs();
  } else {
    selectedBlur = null;
    drawImageWithEffects();
    drawAllBlurs();
  }
}

function drawImageWithEffects() {
  if (!image.src) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let gradient;
    if (gradientType.value === 'radial') {
      const centerX = canvas.width/2;
      const centerY = canvas.height/2;
      const radius = Math.max(canvas.width, canvas.height)/2;
      gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    } else {
      gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    }
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

  let gradient;
  if (gradientType.value === 'radial') {
    const centerX = canvas.width/2;
    const centerY = canvas.height/2;
    const radius = Math.max(canvas.width, canvas.height)/2;
    gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  } else {
    gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  }
  gradient.addColorStop(0, color1.value);
  gradient.addColorStop(1, color2.value);
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

canvas.addEventListener('mousedown', (e) => {
  if (!isBlurMode) return;
  
  const rect = canvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
  const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
  
  let clickedOnBlur = false;
  for (let i = blurObjects.length - 1; i >= 0; i--) {
    const blur = blurObjects[i];
    
    if (selectedBlur === blur) {
      const handleSize = 10;
      
      if (blur.type === 'rectangle') {
        // Top-left handle
        if (isPointInRect(mouseX, mouseY, blur.x - handleSize, blur.y - handleSize, handleSize*2, handleSize*2)) {
          resizing = true;
          resizeHandle = 'topLeft';
          clickedOnBlur = true;
          break;
        }
        // Top-right handle
        else if (isPointInRect(mouseX, mouseY, blur.x + blur.width - handleSize, blur.y - handleSize, handleSize*2, handleSize*2)) {
          resizing = true;
          resizeHandle = 'topRight';
          clickedOnBlur = true;
          break;
        }
        // Bottom-left handle
        else if (isPointInRect(mouseX, mouseY, blur.x - handleSize, blur.y + blur.height - handleSize, handleSize*2, handleSize*2)) {
          resizing = true;
          resizeHandle = 'bottomLeft';
          clickedOnBlur = true;
          break;
        }
        // Bottom-right handle
        else if (isPointInRect(mouseX, mouseY, blur.x + blur.width - handleSize, blur.y + blur.height - handleSize, handleSize*2, handleSize*2)) {
          resizing = true;
          resizeHandle = 'bottomRight';
          clickedOnBlur = true;
          break;
        }
      } else if (blur.type === 'circle') {
        // Circle edge handle
        const handleX = blur.x + blur.radius;
        const handleY = blur.y;
        if (isPointInRect(mouseX, mouseY, handleX - handleSize, handleY - handleSize, handleSize*2, handleSize*2)) {
          resizing = true;
          resizeHandle = 'circleEdge';
          clickedOnBlur = true;
          break;
        }
      }
    }
    
    if (isPointInBlur(mouseX, mouseY, blur)) {
      selectedBlur = blur;
      dragStartX = mouseX;
      dragStartY = mouseY;
      clickedOnBlur = true;
      drawImageWithEffects();
      drawAllBlurs();
      break;
    }
  }
  
  if (!clickedOnBlur) {
    isDrawing = true;
    startX = mouseX;
    startY = mouseY;
    selectedBlur = null;
    drawImageWithEffects();
    drawAllBlurs();
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (!isBlurMode) return;
  
  const rect = canvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
  const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
  
  if (isDrawing) {
    drawImageWithEffects();
    drawAllBlurs();
    
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    if (shapeSelect.value === 'rectangle') {
      ctx.strokeRect(startX, startY, mouseX - startX, mouseY - startY);
    } else {
      const radius = Math.sqrt(Math.pow(mouseX - startX, 2) + Math.pow(mouseY - startY, 2));
      ctx.beginPath();
      ctx.arc(startX, startY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    ctx.setLineDash([]);
  } else if (selectedBlur && resizing) {
    if (resizeHandle === 'topLeft') {
      const width = selectedBlur.x + selectedBlur.width - mouseX;
      const height = selectedBlur.y + selectedBlur.height - mouseY;
      if (width > 10 && height > 10) {
        selectedBlur.x = mouseX;
        selectedBlur.y = mouseY;
        selectedBlur.width = width;
        selectedBlur.height = height;
      }
    } else if (resizeHandle === 'topRight') {
      const width = mouseX - selectedBlur.x;
      const height = selectedBlur.y + selectedBlur.height - mouseY;
      if (width > 10 && height > 10) {
        selectedBlur.y = mouseY;
        selectedBlur.width = width;
        selectedBlur.height = height;
      }
    } else if (resizeHandle === 'bottomLeft') {
      const width = selectedBlur.x + selectedBlur.width - mouseX;
      const height = mouseY - selectedBlur.y;
      if (width > 10 && height > 10) {
        selectedBlur.x = mouseX;
        selectedBlur.width = width;
        selectedBlur.height = height;
      }
    } else if (resizeHandle === 'bottomRight') {
      const width = mouseX - selectedBlur.x;
      const height = mouseY - selectedBlur.y;
      if (width > 10 && height > 10) {
        selectedBlur.width = width;
        selectedBlur.height = height;
      }
    } else if (resizeHandle === 'circleEdge') {
      const deltaX = mouseX - selectedBlur.x;
      const deltaY = mouseY - selectedBlur.y;
      const newRadius = Math.sqrt(deltaX ** 2 + deltaY ** 2);
      
      if (newRadius > 5) {
        selectedBlur.radius = newRadius;
      }
    }
    
    drawImageWithEffects();
    drawAllBlurs();
  } else if (selectedBlur && !resizing && dragStartX !== undefined) {
    const deltaX = mouseX - dragStartX;
    const deltaY = mouseY - dragStartY;
    
    selectedBlur.x += deltaX;
    selectedBlur.y += deltaY;
    
    dragStartX = mouseX;
    dragStartY = mouseY;
    
    drawImageWithEffects();
    drawAllBlurs();
  }
});

canvas.addEventListener('mouseup', (e) => {
  if (!isBlurMode) return;
  
  if (isDrawing) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    let newBlur;
    if (shapeSelect.value === 'rectangle') {
      const x = Math.min(startX, mouseX);
      const y = Math.min(startY, mouseY);
      const width = Math.abs(mouseX - startX);
      const height = Math.abs(mouseY - startY);
      
      if (width > 5 && height > 5) {
        newBlur = {
          type: 'rectangle',
          x: x,
          y: y,
          width: width,
          height: height,
          intensity: parseInt(blurIntensityInput.value)
        };
        blurObjects.push(newBlur);
        selectedBlur = newBlur;
      }
    } else {
      const radius = Math.sqrt(Math.pow(mouseX - startX, 2) + Math.pow(mouseY - startY, 2));
      
      if (radius > 5) {
        newBlur = {
          type: 'circle',
          x: startX,
          y: startY,
          radius: radius,
          intensity: parseInt(blurIntensityInput.value)
        };
        blurObjects.push(newBlur);
        selectedBlur = newBlur;
      }
    }
    
    drawImageWithEffects();
    drawAllBlurs();
    saveState();
  }
  
  isDrawing = false;
  resizing = false;
  dragStartX = undefined;
  dragStartY = undefined;
});

canvas.addEventListener('mouseleave', () => {
  if (isBlurMode) {
    isDrawing = false;
    resizing = false;
  }
});

function isPointInBlur(x, y, blur) {
  if (blur.type === 'rectangle') {
    return isPointInRect(x, y, blur.x, blur.y, blur.width, blur.height);
  } else {
    const distance = Math.sqrt(Math.pow(x - blur.x, 2) + Math.pow(y - blur.y, 2));
    return distance <= blur.radius;
  }
}

function isPointInRect(x, y, rectX, rectY, rectWidth, rectHeight) {
  return x >= rectX && x <= rectX + rectWidth && 
         y >= rectY && y <= rectY + rectHeight;
}

function drawAllBlurs() {
  if (blurObjects.length === 0) return;
  
  blurObjects.forEach((blur, index) => {
    applyBlurObject(blur);
    
    if (selectedBlur === blur) {
      ctx.strokeStyle = '#3498db';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      if (blur.type === 'rectangle') {
        ctx.strokeRect(blur.x, blur.y, blur.width, blur.height);
        
        ctx.setLineDash([]);
        const handleSize = 6;
        
        ctx.fillStyle = 'white';
        ctx.strokeStyle = '#3498db';
        
        ctx.beginPath();
        ctx.rect(blur.x - handleSize, blur.y - handleSize, handleSize*2, handleSize*2);
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.rect(blur.x + blur.width - handleSize, blur.y - handleSize, handleSize*2, handleSize*2);
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.rect(blur.x - handleSize, blur.y + blur.height - handleSize, handleSize*2, handleSize*2);
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.rect(blur.x + blur.width - handleSize, blur.y + blur.height - handleSize, handleSize*2, handleSize*2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(blur.x, blur.y, blur.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.setLineDash([]);
        ctx.fillStyle = 'white';
        ctx.strokeStyle = '#3498db';
        const handleSize = 6;
        const handleX = blur.x + blur.radius - handleSize;
        const handleY = blur.y - handleSize;
        
        ctx.beginPath();
        ctx.rect(handleX, handleY, handleSize*2, handleSize*2);
        ctx.fill();
        ctx.stroke();
      }
      
      ctx.setLineDash([]);
    }
  });
}

function applyBlurObject(blur) {
  ctx.save();
  ctx.beginPath();
  
  if (blur.type === 'rectangle') {
    ctx.rect(blur.x, blur.y, blur.width, blur.height);
  } else {
    ctx.arc(blur.x, blur.y, blur.radius, 0, Math.PI * 2);
  }
  
  ctx.clip();
  ctx.filter = `blur(${blur.intensity}px)`;
  
  const offsetX = (canvas.width - image.width) / 2;
  const offsetY = (canvas.height - image.height) / 2;
  ctx.drawImage(image, offsetX, offsetY, image.width, image.height);
  
  ctx.restore();
}

document.addEventListener('keydown', (e) => {
  if (isBlurMode && selectedBlur && e.key === 'Delete') {
    const index = blurObjects.indexOf(selectedBlur);
    if (index > -1) {
      blurObjects.splice(index, 1);
      selectedBlur = null;
      drawImageWithEffects();
      drawAllBlurs();
      saveState();
    }
  }
});

blurIntensityInput.addEventListener('input', () => {
  if (selectedBlur) {
    selectedBlur.intensity = parseInt(blurIntensityInput.value);
    drawImageWithEffects();
    drawAllBlurs();
  }
});

function downloadImage() {
  const link = document.createElement('a');
  link.download = 'edited-image.png';
  link.href = canvas.toDataURL();
  link.click();
}

function resetCanvas() {
  blurObjects = [];
  selectedBlur = null;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  image = new Image();
  uploadOverlay.classList.remove('hidden');
  imageInput.value = '';
  canvas.width = 400;
  canvas.height = 300;
  
  color1.value = "#3498db";
  color2.value = "#9b59b6";
  cornerRadius.value = 0;
  backgroundSizeInput.value = 20;
  aspectRatio.value = "original";
  bgCornerRadius.value = 0;
  blurToggle.checked = false;
  blurIntensityInput.value = 5;
  shapeSelect.value = "rectangle";
  shadowIntensity.value = 0;
  gradientType.value = "linear";
  cropIntensity.value = 0;
  
  document.getElementById("blurIntensityDiv").style.display = "none";
  document.getElementById("shapeDiv").style.display = "none";
  
  history = [];
  currentState = -1;
  drawImageWithEffects();
}