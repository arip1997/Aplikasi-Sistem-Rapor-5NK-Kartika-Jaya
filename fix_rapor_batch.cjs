const fs = require('fs');
let content = fs.readFileSync('./src/components/RaporCetak.tsx', 'utf-8');

content = content.replace(
  /waliKelasName: string;/g,
  `waliKelasName: string;
  initialBatchNisList?: string[];`
);

content = content.replace(
  /waliKelasName,\s*onAddExportLog/g,
  `waliKelasName,
  initialBatchNisList,
  onAddExportLog`
);

// We should update the useEffect that synchronizes the student prop
content = content.replace(
  /\/\/ Synchronize state when the target student prop changes\n\s*useEffect\(\(\) => \{\n\s*if \(student\) \{\n\s*setPreviewNis\(student\.nis\);\n\s*setSelectedNisList\(\[student\.nis\]\);\n\s*\}\n\s*\}, \[student\]\);/g,
  `// Synchronize state when the target student prop changes
  useEffect(() => {
    if (student) {
      setPreviewNis(student.nis);
      if (initialBatchNisList && initialBatchNisList.length > 0) {
        setSelectedNisList(initialBatchNisList);
      } else {
        setSelectedNisList([student.nis]);
      }
    }
  }, [student, initialBatchNisList]);`
);

fs.writeFileSync('./src/components/RaporCetak.tsx', content, 'utf-8');
console.log("Added initialBatchNisList to RaporCetak");
