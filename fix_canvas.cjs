const fs = require('fs');

function fixCanvasRemove(file) {
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(/canvas\.remove\(\);/g, 'if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);');
  content = content.replace(/canvases\.forEach\(canvas => canvas\.remove\(\)\);/g, 'canvases.forEach(canvas => { if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas); });');
  
  // Fix autoPrintImmediately
  const autoPrintFix = `if (autoPrintImmediately) {
        pdf.autoPrint();
        try {
          const blob = pdf.output('bloburl');
          window.open(blob, '_blank');
        } catch (e) {
          pdf.save(filename);
        }
      } else {
        pdf.save(filename);
      }`;
      
  content = content.replace(/if \(autoPrintImmediately\) \{\s*pdf\.autoPrint\(\);\s*\}\s*pdf\.save\(filename\);/g, autoPrintFix);

  fs.writeFileSync(file, content, 'utf-8');
}

fixCanvasRemove('./src/components/RaporCetak.tsx');
fixCanvasRemove('./src/components/GradeRecap.tsx');

console.log('Fixed canvas.remove() and autoPrintImmediately.');
