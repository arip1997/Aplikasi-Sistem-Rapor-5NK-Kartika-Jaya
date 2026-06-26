const fs = require('fs');

let content = fs.readFileSync('./src/components/RaporCetak.tsx', 'utf-8');

const iframePrintHTML = `
          const blobUrl = pdf.output('bloburl');
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.src = blobUrl;
          document.body.appendChild(iframe);
          iframe.onload = () => {
            setTimeout(() => {
              iframe.contentWindow?.print();
            }, 1);
          };
`;

content = content.replace(
  /pdf\.autoPrint\(\);\n\s*try \{\n\s*const blob = pdf\.output\('bloburl'\);\n\s*window\.open\(blob, '_blank'\);\n\s*\} catch \(e\) \{\n\s*pdf\.save\(filename\);\n\s*\}/g,
  iframePrintHTML
);

fs.writeFileSync('./src/components/RaporCetak.tsx', content, 'utf-8');
console.log('Fixed autoPrintImmediately using iframe.');
