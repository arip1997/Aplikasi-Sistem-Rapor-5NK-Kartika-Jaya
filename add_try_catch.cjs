const fs = require('fs');
let content = fs.readFileSync('./src/components/RaporCetak.tsx', 'utf-8');

// replace HTML2canvas calls with try-catch
content = content.replace(
  /const canvas = await html2canvas\(pageEl, \{ scale: 2\.0, useCORS: true, logging: false, scrollY: -window\.scrollY, windowWidth: document\.documentElement\.offsetWidth, windowHeight: document\.documentElement\.offsetHeight \}\);\n\s*const imgData = canvas\.toDataURL\('image\/jpeg', 0\.95\);/g,
  `let canvas;
          try {
            canvas = await html2canvas(pageEl, { scale: 2.0, useCORS: true, logging: false, scrollY: -window.scrollY, windowWidth: document.documentElement.offsetWidth, windowHeight: document.documentElement.offsetHeight });
          } catch (e) {
            console.error('html2canvas error:', e);
            continue;
          }
          const imgData = canvas.toDataURL('image/jpeg', 0.95);`
);

// GradeRecap.tsx
let recapContent = fs.readFileSync('./src/components/GradeRecap.tsx', 'utf-8');
recapContent = recapContent.replace(
  /const canvas = await html2canvas\(element, \{ scale: 1\.5, useCORS: true, logging: false, windowWidth: document\.documentElement\.offsetWidth, windowHeight: document\.documentElement\.offsetHeight \}\);\n\s*const imgData = canvas\.toDataURL\('image\/jpeg', 0\.95\);/g,
  `let canvas;
      try {
        canvas = await html2canvas(element, { scale: 1.5, useCORS: true, logging: false, windowWidth: document.documentElement.offsetWidth, windowHeight: document.documentElement.offsetHeight });
      } catch(e) {
        console.error('html2canvas error in GradeRecap:', e);
        alert('Gagal membuat PDF karena kesalahan rendering (html2canvas).');
        setIsGeneratingRecapPdf(false);
        setIsPrintingRecap(false);
        return;
      }
      const imgData = canvas.toDataURL('image/jpeg', 0.95);`
);

fs.writeFileSync('./src/components/RaporCetak.tsx', content, 'utf-8');
fs.writeFileSync('./src/components/GradeRecap.tsx', recapContent, 'utf-8');
console.log('Added try-catch for html2canvas.');
