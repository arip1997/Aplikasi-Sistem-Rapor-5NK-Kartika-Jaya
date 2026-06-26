const fs = require('fs');
let content = fs.readFileSync('./src/App.tsx', 'utf-8');

const methodHTML = `
  const handleResetPrintStatus = () => {
    setStudents(prev => prev.map(s => s.kelas === selectedClass ? { ...s, printStatus: false } : s));
  };

  const handleMarkAsPrinted = (studentIds: string[]) => {
`;

content = content.replace(
  /const handleMarkAsPrinted = \(studentIds: string\[\]\) => \{/g,
  methodHTML
);

fs.writeFileSync('./src/App.tsx', content, 'utf-8');
