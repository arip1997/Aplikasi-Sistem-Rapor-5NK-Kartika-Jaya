const fs = require('fs');
let content = fs.readFileSync('./src/components/RaporCetak.tsx', 'utf-8');

// Also make sure GC is helped by explicitly dereferencing pdf
// Replace `let pdfBlob: Blob | null = pdf.output('blob');`
// with `let pdfBlob: Blob | null = pdf.output('blob'); pdf = null;` to free jsPDF instance?
// Actually jsPDF isn't huge, but it's good to free it.
content = content.replace(/let pdfBlob: Blob \| null = pdf\.output\('blob'\);/g, "let pdfBlob: Blob | null = pdf.output('blob');\n          (pdf as any) = null;");

// Fix `window.open` block one more time if there's any.
content = content.replace(/window\.open\(url, '_blank'\)/g, "/* window.open removed */");

// Also check handleDownloadPDF
content = content.replace(/if \(autoPrintImmediately\) \{\s*pdf\.autoPrint\(\);\s*\/\/ Since window\.open.*\s*\/\/.*\s*pdf\.save\(filename\);\s*\}\s*else\s*\{\s*pdf\.save\(filename\);\s*\}/g, `if (autoPrintImmediately) {
        pdf.autoPrint();
      }
      pdf.save(filename);`);

fs.writeFileSync('./src/components/RaporCetak.tsx', content, 'utf-8');
console.log('Fixed jsPDF memory in RaporCetak.tsx');
