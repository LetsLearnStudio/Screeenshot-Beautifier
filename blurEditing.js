const blurToggle = document.getElementById('blurToggle');
const blurIntensityInput = document.getElementById('blurIntensity');
const shapeSelect = document.getElementById('shape');

// Blur state variables
let isDrawing = false;
let startX, startY;
let dragStartX, dragStartY;
let resizing = false;
let resizeHandle = null;

// Blur functions
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
  }
}

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

// Canvas interaction handlers
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

// Event listeners
blurToggle.addEventListener('change', toggleBlurMode);
blurIntensityInput.addEventListener('input', () => {
  if (selectedBlur) {
    selectedBlur.intensity = parseInt(blurIntensityInput.value);
    drawImageWithEffects();
    drawAllBlurs();
  }
});

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