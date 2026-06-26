const fs = require('fs');
let content = fs.readFileSync('./src/components/RaporCetak.tsx', 'utf-8');

// Fix handleDownloadPDF stale originalElement
content = content.replace(/const originalElement = document\.getElementById\('rapor-pdf-content'\);\s*if \(!originalElement\) \{\s*console\.error\("\[Cetak PDF Error\] #rapor-pdf-content target selector element is missing from document DOM\."\);\s*setIsGeneratingPdf\(false\);\s*return;\s*\}/g, "");

content = content.replace(/\/\/ Allow DOM repaint\s*await new Promise\(resolve => setTimeout\(resolve, 300\)\);/g, `// Allow DOM repaint
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const originalElement = document.getElementById('rapor-pdf-content');
      if (!originalElement) {
        console.error("[Cetak PDF Error] #rapor-pdf-content target selector element is missing from document DOM.");
        setIsGeneratingPdf(false);
        return;
      }`);

fs.writeFileSync('./src/components/RaporCetak.tsx', content, 'utf-8');
console.log("Fixed stale originalElement in handleDownloadPDF");
