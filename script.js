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
let blurObjects = []; // Array to store all blur regions
let selectedBlur = null; // Currently selected blur region
let dragStartX, dragStartY; // For moving blur regions
let resizing = false; // For resizing blur regions
let resizeHandle = null; // Which handle is being dragged

// Undo-Redo functionality
let history = [];
let currentState = -1;

// Initialize canvas
canvas.width = 400;
canvas.height = 300;

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
  
  if (isBlurMode) {
    // Save current state before entering blur mode
    saveState();
    drawAllBlurs(); // Make sure existing blurs are displayed
  } else {
    // Deselect any selected blur when exiting blur mode
    selectedBlur = null;
    drawImageWithEffects();
    drawAllBlurs();
  }
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
  
  // After the function completes, call drawAllBlurs if we're in blur mode
  if (isBlurMode) {
    setTimeout(drawAllBlurs, 0);
  }
}

// More precise blur drawing
canvas.addEventListener('mousedown', (e) => {
  if (!isBlurMode) return;
  
  const rect = canvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
  const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
  
  // Check if we're clicking on an existing blur to select it
  let clickedOnBlur = false;
  for (let i = blurObjects.length - 1; i >= 0; i--) {
    const blur = blurObjects[i];
    
    // Check if clicking on resize handles (if blur is already selected)
    if (selectedBlur === blur) {
      const handleSize = 10;
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
    }
    
    // Check if we're clicking inside the blur
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
    // If we didn't click on a blur, start drawing a new one
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
    // Drawing a new blur
    drawImageWithEffects();
    drawAllBlurs();
    
    // Preview the rectangle as we draw
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
    // Resize the selected blur
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
    }
    
    // Redraw with the updated blur
    drawImageWithEffects();
    drawAllBlurs();
  } else if (selectedBlur && !resizing && dragStartX !== undefined) {
    // Move the selected blur
    const deltaX = mouseX - dragStartX;
    const deltaY = mouseY - dragStartY;
    
    selectedBlur.x += deltaX;
    selectedBlur.y += deltaY;
    
    dragStartX = mouseX;
    dragStartY = mouseY;
    
    // Redraw with the moved blur
    drawImageWithEffects();
    drawAllBlurs();
  }
});

canvas.addEventListener('mouseup', (e) => {
  if (!isBlurMode) return;
  
  if (isDrawing) {
    // Finalize drawing the new blur
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    let newBlur;
    if (shapeSelect.value === 'rectangle') {
      // Create normalized rectangle (handle negative width/height)
      const x = Math.min(startX, mouseX);
      const y = Math.min(startY, mouseY);
      const width = Math.abs(mouseX - startX);
      const height = Math.abs(mouseY - startY);
      
      // Only add if it has some size
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
      // Circle blur
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
  
  // Reset states
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

// Helper function: Check if point is inside blur
function isPointInBlur(x, y, blur) {
  if (blur.type === 'rectangle') {
    return isPointInRect(x, y, blur.x, blur.y, blur.width, blur.height);
  } else {
    const distance = Math.sqrt(Math.pow(x - blur.x, 2) + Math.pow(y - blur.y, 2));
    return distance <= blur.radius;
  }
}

// Helper function: Check if point is inside rectangle
function isPointInRect(x, y, rectX, rectY, rectWidth, rectHeight) {
  return x >= rectX && x <= rectX + rectWidth && 
         y >= rectY && y <= rectY + rectHeight;
}

// Apply all blur objects to the canvas
function drawAllBlurs() {
  // First draw the image without blurs
  if (blurObjects.length === 0) return;
  
  // Apply each blur in order
  blurObjects.forEach((blur, index) => {
    applyBlurObject(blur);
    
    // If this is the selected blur, draw handles
    if (selectedBlur === blur) {
      ctx.strokeStyle = '#3498db';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      if (blur.type === 'rectangle') {
        ctx.strokeRect(blur.x, blur.y, blur.width, blur.height);
        
        // Draw resize handles
        ctx.setLineDash([]);
        const handleSize = 6;
        
        // Draw handles at corners
        ctx.fillStyle = 'white';
        ctx.strokeStyle = '#3498db';
        
        // Top-left handle
        ctx.beginPath();
        ctx.rect(blur.x - handleSize, blur.y - handleSize, handleSize*2, handleSize*2);
        ctx.fill();
        ctx.stroke();
        
        // Top-right handle
        ctx.beginPath();
        ctx.rect(blur.x + blur.width - handleSize, blur.y - handleSize, handleSize*2, handleSize*2);
        ctx.fill();
        ctx.stroke();
        
        // Bottom-left handle
        ctx.beginPath();
        ctx.rect(blur.x - handleSize, blur.y + blur.height - handleSize, handleSize*2, handleSize*2);
        ctx.fill();
        ctx.stroke();
        
        // Bottom-right handle
        ctx.beginPath();
        ctx.rect(blur.x + blur.width - handleSize, blur.y + blur.height - handleSize, handleSize*2, handleSize*2);
        ctx.fill();
        ctx.stroke();
      } else {
        // Draw circle outline
        ctx.beginPath();
        ctx.arc(blur.x, blur.y, blur.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw resize handle
        ctx.setLineDash([]);
        ctx.fillStyle = 'white';
        ctx.strokeStyle = '#3498db';
        const handleSize = 6;
        
        // Handle at the edge of circle
        ctx.beginPath();
        ctx.rect(blur.x + blur.radius - handleSize, blur.y - handleSize, handleSize*2, handleSize*2);
        ctx.fill();
        ctx.stroke();
      }
      
      ctx.setLineDash([]);
    }
  });
}

// Apply a single blur object
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
  
  // Calculate the position to draw the image at
  const offsetX = (canvas.width - image.width) / 2;
  const offsetY = (canvas.height - image.height) / 2;
  ctx.drawImage(image, offsetX, offsetY, image.width, image.height);
  
  ctx.restore();
}

// Add keyboard shortcut to delete selected blur
document.addEventListener('keydown', (e) => {
  if (isBlurMode && selectedBlur && e.key === 'Delete') {
    // Remove the selected blur
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

// Add ability to adjust intensity of selected blur
blurIntensityInput.addEventListener('input', () => {
  if (selectedBlur) {
    selectedBlur.intensity = parseInt(blurIntensityInput.value);
    drawImageWithEffects();
    drawAllBlurs();
  }
});

// Download and reset
function downloadImage() {
  const link = document.createElement('a');
  link.download = 'edited-image.png';
  link.href = canvas.toDataURL();
  link.click();
}

function resetCanvas() {
  // Clear blur objects
  blurObjects = [];
  selectedBlur = null;
  
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
