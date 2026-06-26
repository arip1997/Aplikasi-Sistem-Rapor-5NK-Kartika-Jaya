const fs = require('fs');
let content = fs.readFileSync('./src/components/GradeRecap.tsx', 'utf-8');

// Ensure flushSync is imported
if (!content.includes("import { flushSync } from 'react-dom';")) {
  content = content.replace(
    /import \{ useState, useMemo \} from 'react';/g,
    `import { useState, useMemo } from 'react';
import { flushSync } from 'react-dom';`
  );
}

// Wrap state updates in flushSync
content = content.replace(
  /setIsGeneratingRecapPdf\(true\);\n\s*setIsPrintingRecap\(true\);/g,
  `flushSync(() => {
      setIsGeneratingRecapPdf(true);
      setIsPrintingRecap(true);
    });`
);

fs.writeFileSync('./src/components/GradeRecap.tsx', content, 'utf-8');
console.log('Added flushSync to GradeRecap.tsx');
