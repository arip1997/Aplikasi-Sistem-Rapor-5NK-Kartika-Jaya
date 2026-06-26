const fs = require('fs');

function fixHtml2CanvasOptions(file) {
  let content = fs.readFileSync(file, 'utf-8');
  
  const options = `{ scale: 1.0, useCORS: true, logging: false, scrollY: -window.scrollY, windowWidth: document.documentElement.offsetWidth, windowHeight: document.documentElement.offsetHeight }`;
  content = content.replace(/\{ scale: 1\.0, useCORS: true, logging: false \}/g, options);

  const optionsRecap = `{
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.offsetWidth,
        windowHeight: document.documentElement.offsetHeight
      }`;
  content = content.replace(/\{\s*scale: 1\.5,\s*useCORS: true,\s*logging: false,\s*backgroundColor: '#ffffff'\s*\}/g, optionsRecap);
  
  fs.writeFileSync(file, content, 'utf-8');
}

fixHtml2CanvasOptions('./src/components/RaporCetak.tsx');
fixHtml2CanvasOptions('./src/components/GradeRecap.tsx');

console.log('Fixed html2canvas scroll options.');
