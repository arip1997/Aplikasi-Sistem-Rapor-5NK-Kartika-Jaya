const fs = require('fs');
let content = fs.readFileSync('./src/App.tsx', 'utf-8');

content = content.replace(
  /const handleUpdateStudentGrades =/g,
  `const handleResetPrintStatus = () => {
    const next = students.map(s => s.kelas === selectedClass ? { ...s, printStatus: false } : s);
    handlePersistStudents(next);
  };
  
  const handleUpdateStudentGrades =`
);

fs.writeFileSync('./src/App.tsx', content, 'utf-8');
