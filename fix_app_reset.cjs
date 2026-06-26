const fs = require('fs');
let appContent = fs.readFileSync('./src/App.tsx', 'utf-8');

appContent = appContent.replace(
  /const handleMarkAsPrinted = \(studentIds: string\[\]\) => \{/g,
  `const handleResetPrintStatus = () => {
    setStudents(prev => prev.map(s => s.kelas === selectedClass ? { ...s, printStatus: false } : s));
  };

  const handleMarkAsPrinted = (studentIds: string[]) => {`
);

appContent = appContent.replace(
  /onClearClassGrades=\{handleClearClassGrades\}/g,
  `onClearClassGrades={handleClearClassGrades}
                    onResetPrintStatus={handleResetPrintStatus}`
);

fs.writeFileSync('./src/App.tsx', appContent, 'utf-8');
console.log('App.tsx updated for reset print status');
