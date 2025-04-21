// colorGradient.js

// DOM elements
const color1 = document.getElementById('color1');
const color2 = document.getElementById('color2');
const gradientType = document.getElementById('gradientType');

// Color functions
function randomizeColors() {
  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function hslToHex(h, s, l) {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  function generateHarmonizedColors() {
    const baseHue = getRandomInt(0, 360);
    const schemes = [
      () => [
        { h: baseHue, s: getRandomInt(60, 90), l: getRandomInt(30, 60) },
        { h: (baseHue + 180) % 360, s: getRandomInt(60, 90), l: getRandomInt(30, 60) }
      ],
      () => [
        { h: (baseHue - 30 + 360) % 360, s: getRandomInt(60, 90), l: getRandomInt(30, 60) },
        { h: baseHue, s: getRandomInt(60, 90), l: getRandomInt(30, 60) }
      ],
      () => [
        { h: baseHue, s: getRandomInt(60, 90), l: getRandomInt(30, 60) },
        { h: (baseHue + 120) % 360, s: getRandomInt(60, 90), l: getRandomInt(30, 60) }
      ]
    ];
    return schemes[getRandomInt(0, schemes.length - 1)]();
  }

  const [color1HSL, color2HSL] = generateHarmonizedColors();
  color1.value = hslToHex(color1HSL.h, color1HSL.s, color1HSL.l);
  color2.value = hslToHex(color2HSL.h, color2HSL.s, color2HSL.l);
  drawImageWithEffects();
}


function flipColors() {
  // Swap color values
  const temp = color1.value;
  color1.value = color2.value;
  color2.value = temp;
  
  // Reverse gradient direction logic
  if (gradientType.value === 'linear') {
    // Force redraw with swapped gradient direction
    const tempType = gradientType.value;
    gradientType.value = 'radial';
    gradientType.value = tempType;
  }
  
  drawImageWithEffects();
}

// Event listeners (remove redundant ones)
color1.addEventListener('input', drawImageWithEffects);
color2.addEventListener('input', drawImageWithEffects);
gradientType.addEventListener('change', drawImageWithEffects);