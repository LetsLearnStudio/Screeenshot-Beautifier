let history = [];
let currentState = -1;

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
      if (isBlurMode) drawAllBlurs();
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
      if (isBlurMode) drawAllBlurs();
    };
  }
}

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
  
  // Reset controls
  document.getElementById('color1').value = "#3498db";
  document.getElementById('color2').value = "#9b59b6";
  cornerRadius.value = 0;
  backgroundSizeInput.value = 20;
  aspectRatio.value = "original";
  bgCornerRadius.value = 0;
  document.getElementById('blurToggle').checked = false;
  document.getElementById('blurIntensity').value = 5;
  document.getElementById('shape').value = "rectangle";
  shadowIntensity.value = 0;
  document.getElementById('gradientType').value = "linear";
  cropIntensity.value = 0;
  
  document.getElementById("blurIntensityDiv").style.display = "none";
  document.getElementById("shapeDiv").style.display = "none";
  
  history = [];
  currentState = -1;
  drawImageWithEffects();
}