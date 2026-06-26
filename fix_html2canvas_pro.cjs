const fs = require('fs');

function revertToHtml2CanvasPro(file) {
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(/import html2canvas from 'html2canvas';/g, "import html2canvas from 'html2canvas-pro';");
  fs.writeFileSync(file, content, 'utf-8');
}

revertToHtml2CanvasPro('./src/components/GradeRecap.tsx');
revertToHtml2CanvasPro('./src/components/RaporCetak.tsx');

// Also fix handleDownloadClassPDF and handleDownloadAllPDFs originalElement fetching.
let raporContent = fs.readFileSync('./src/components/RaporCetak.tsx', 'utf-8');

// For handleDownloadClassPDF (loop version)
raporContent = raporContent.replace(
  /const originalElement = document\.getElementById\('rapor-pdf-content'\);\n\s*if \(!originalElement\) continue;\n\n\s*void originalElement\.offsetHeight;\n\s*\n\s*\/\/ Wait for images and layouts to settle\n\s*await new Promise\(resolve => setTimeout\(resolve, 200\)\);/g,
  `// Wait for images and layouts to settle
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const originalElement = document.getElementById('rapor-pdf-content');
        if (!originalElement) continue;

        void originalElement.offsetHeight;`
);

// Check if any others need fixing
// handleDownloadAllPDFs (ZIP)
raporContent = raporContent.replace(
  /const originalElement = document\.getElementById\('rapor-pdf-content'\);\n\s*if \(!originalElement\) \{\n\s*console\.error\("\[Cetak Semua Error\] #rapor-pdf-content element is missing\."\);\n\s*throw new Error\(\`Elemen rapor-pdf-content tidak ditemukan untuk \$\{curStudent\.name\}\`\);\n\s*\}/g,
  `const originalElement = document.getElementById('rapor-pdf-content');
          if (!originalElement) {
            console.error("[Cetak Semua Error] #rapor-pdf-content element is missing.");
            throw new Error(\`Elemen rapor-pdf-content tidak ditemukan untuk \${curStudent.name}\`);
          }`
);

fs.writeFileSync('./src/components/RaporCetak.tsx', raporContent, 'utf-8');
console.log('Reverted to html2canvas-pro and fixed element fetches.');
