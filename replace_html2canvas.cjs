const fs = require('fs');

function replaceHtml2Canvas(file) {
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(/import html2canvas from 'html2canvas-pro';/g, "import { toCanvas } from 'html-to-image';");
  
  // GradeRecap.tsx uses html2canvas(element, {...})
  content = content.replace(/await html2canvas\(element, \{[\s\S]*?\}\);/g, `await toCanvas(element, {
        pixelRatio: 1.5,
        backgroundColor: '#ffffff'
      });`);
      
  // RaporCetak.tsx uses html2canvas(pageEl, {...})
  // Let's replace the whole await html2canvas line
  content = content.replace(/const canvas = await html2canvas\(pageEl, \{ scale: 1\.0, useCORS: true, logging: false, scrollY: -window\.scrollY, windowWidth: document\.documentElement\.offsetWidth, windowHeight: document\.documentElement\.offsetHeight \}\);/g, 
  `const canvas = await toCanvas(pageEl, { pixelRatio: 2, backgroundColor: '#ffffff' });`);
  
  fs.writeFileSync(file, content, 'utf-8');
}

replaceHtml2Canvas('./src/components/GradeRecap.tsx');
replaceHtml2Canvas('./src/components/RaporCetak.tsx');

console.log('Replaced html2canvas with html-to-image toCanvas.');
