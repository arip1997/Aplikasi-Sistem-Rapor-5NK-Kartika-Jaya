const fs = require('fs');

function smoothTransitions() {
  let content = fs.readFileSync('./src/App.tsx', 'utf-8');
  content = content.replace(/initial=\{\{ opacity: 0, y: 12 \}\}/g, 'initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}');
  content = content.replace(/animate=\{\{ opacity: 1, y: 0 \}\}/g, 'animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}');
  content = content.replace(/exit=\{\{ opacity: 0, y: -12 \}\}/g, 'exit={{ opacity: 0, y: -20, filter: "blur(4px)" }}');
  content = content.replace(/transition=\{\{ duration: 0.25, ease: 'easeInOut' \}\}/g, 'transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}');
  
  // also the empty-spreadsheet
  content = content.replace(/initial=\{\{ opacity: 0, scale: 0.98 \}\}/g, 'initial={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}');
  content = content.replace(/animate=\{\{ opacity: 1, scale: 1 \}\}/g, 'animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}');
  content = content.replace(/exit=\{\{ opacity: 0, scale: 0.98 \}\}/g, 'exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}');
  content = content.replace(/transition=\{\{ duration: 0.2 \}\}/g, 'transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}');

  fs.writeFileSync('./src/App.tsx', content, 'utf-8');
}

smoothTransitions();
console.log('Smoothed transitions in App.tsx');
