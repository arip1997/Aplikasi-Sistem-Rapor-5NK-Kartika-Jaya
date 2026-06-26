const fs = require('fs');

let content = fs.readFileSync('./src/components/RaporCetak.tsx', 'utf-8');

// Remove the html2pdfFn check from all functions
content = content.replace(/const html2pdfFn = typeof html2pdf === 'function' \? html2pdf : \(html2pdf as any\)\.default;\s*if \(!html2pdfFn\) \{\s*console\.error\("[^"]+"\);\s*return;\s*\}/g, '');
content = content.replace(/const html2pdfFn = typeof html2pdf === 'function' \? html2pdf : \(html2pdf as any\)\.default;\s*if \(!html2pdfFn\) \{\s*console\.error\("[^"]+"\);\s*setIsGeneratingPdf\(false\);\s*return;\s*\}/g, '');

// Fix scale and memory leak in html2canvas
content = content.replace(/\{ scale: 2, useCORS: true, logging: false \}/g, '{ scale: 1.5, useCORS: true, logging: false }');

content = content.replace(/\/\/ Release memory instantly\s+canvas\.width = 0;\s+canvas\.height = 0;/g, 
  '// Release memory instantly\n          canvas.width = 0;\n          canvas.height = 0;\n          canvas.remove();\n          await new Promise(r => setTimeout(r, 50));');

fs.writeFileSync('./src/components/RaporCetak.tsx', content, 'utf-8');
console.log('Fixed RaporCetak.tsx');
