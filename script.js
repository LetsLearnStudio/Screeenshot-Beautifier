// Existing code remains the same with these additional functions

// Add visual interaction effects
function addInteractionEffects() {
  const buttons = document.querySelectorAll('button');
  const inputs = document.querySelectorAll('input, select');

  buttons.forEach(button => {
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.05)';
      button.style.boxShadow = '0 4px 10px rgba(0,0,0,0.1)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = 'none';
    });
  });

  inputs.forEach(input => {
    input.addEventListener('change', () => {
      input.style.transform = 'scale(1.02)';
      setTimeout(() => input.style.transform = 'scale(1)', 200);
    });
  });
}

// Keyboard shortcuts for undo and redo
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey) {
    switch(event.key) {
      case 'z':
        undo();
        break;
      case 'y':
        redo();
        break;
    }
  }
});

// Call interaction effects after page load
document.addEventListener('DOMContentLoaded', addInteractionEffects);
