const fs = require('fs');
let content = fs.readFileSync('./src/App.tsx', 'utf-8');

// Add state for batch print
content = content.replace(
  /const \[autoPrintImmediately, setAutoPrintImmediately\] = useState\(false\);/g,
  `const [autoPrintImmediately, setAutoPrintImmediately] = useState(false);
  const [batchPrintNisList, setBatchPrintNisList] = useState<string[]>([]);`
);

// Add onBatchPrint handler
content = content.replace(
  /const handleUpdateComments =/g,
  `const handleBatchPrint = (studentIds: string[]) => {
    const nisList = studentIds.map(id => students.find(s => s.id === id)?.nis).filter(Boolean) as string[];
    setBatchPrintNisList(nisList);
    
    // Select the first student as the active preview
    if (studentIds.length > 0) {
      setSelectedStudentId(studentIds[0]);
    }
    
    setViewMode('print');
  };

  const handleUpdateComments =`
);

// Pass to ExcelGrid
content = content.replace(
  /dirtyCells=\{dirtyCells\}\n\s*aiModifiedStudentIds=\{aiModifiedStudentIds\}/g,
  `dirtyCells={dirtyCells}
                aiModifiedStudentIds={aiModifiedStudentIds}
                onBatchPrint={handleBatchPrint}`
);

// Pass to RaporCetak
content = content.replace(
  /waliKelasName=\{activeWaliKelas\.name\}/g,
  `waliKelasName={activeWaliKelas.name}
              initialBatchNisList={batchPrintNisList}`
);

// We need to clear the batchPrintNisList when entering print mode manually so it doesn't linger
content = content.replace(
  /onClick=\{\(\) => setViewMode\('print'\)\}/g,
  `onClick={() => { setBatchPrintNisList([]); setViewMode('print'); }}`
);

fs.writeFileSync('./src/App.tsx', content, 'utf-8');
console.log("Updated App.tsx to use handleBatchPrint");
