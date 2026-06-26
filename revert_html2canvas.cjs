const fs = require('fs');

function revertToHtml2Canvas(file) {
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(/import \{ toCanvas \} from 'html-to-image';/g, "import html2canvas from 'html2canvas';");
  
  // GradeRecap.tsx
  content = content.replace(/await toCanvas\(element, \{\n\s*pixelRatio: 1\.5,\n\s*backgroundColor: '#ffffff'\n\s*\}\);/g, `await html2canvas(element, { scale: 1.5, useCORS: true, logging: false, windowWidth: document.documentElement.offsetWidth, windowHeight: document.documentElement.offsetHeight });`);
      
  // RaporCetak.tsx
  content = content.replace(/const canvas = await toCanvas\(pageEl, \{ pixelRatio: 2, backgroundColor: '#ffffff' \}\);/g, 
  `const canvas = await html2canvas(pageEl, { scale: 2.0, useCORS: true, logging: false, scrollY: -window.scrollY, windowWidth: document.documentElement.offsetWidth, windowHeight: document.documentElement.offsetHeight });`);
  
  fs.writeFileSync(file, content, 'utf-8');
}

revertToHtml2Canvas('./src/components/GradeRecap.tsx');
revertToHtml2Canvas('./src/components/RaporCetak.tsx');

console.log('Reverted to html2canvas.');
