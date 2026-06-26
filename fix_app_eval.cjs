const fs = require('fs');
let content = fs.readFileSync('./src/App.tsx', 'utf-8');

content = content.replace(
  /onClearClassGrades=\{handleClearClassGrades\}\n\s*onResetPrintStatus=\{handleResetPrintStatusOk\}\n\s*selectedClass=\{selectedClass\}/g,
  `onClearClassGrades={handleClearClassGrades}
              selectedClass={selectedClass}`
);

fs.writeFileSync('./src/App.tsx', content, 'utf-8');
