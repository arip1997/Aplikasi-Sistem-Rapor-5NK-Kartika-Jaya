const fs = require('fs');
let content = fs.readFileSync('./src/components/ExcelGrid.tsx', 'utf-8');

content = content.replace(
  /onSelectStudent: \(student: Student\) => void;/g,
  `onSelectStudent: (student: Student) => void;
  onBatchPrint?: (studentIds: string[]) => void;`
);

content = content.replace(
  /onSelectStudent,\s*selectedStudent/g,
  `onSelectStudent,
  onBatchPrint,
  selectedStudent`
);

const batchPrintBtnHtml = `
            {/* Batch PDF Print Button */}
            {onBatchPrint && Object.values(checkedStudentIds).some(v => v) && (
              <button
                onClick={() => {
                  const targetStudentIds = Object.keys(checkedStudentIds).filter(id => checkedStudentIds[id]);
                  onBatchPrint(targetStudentIds);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm shrink-0"
              >
                <Printer className="h-3.5 w-3.5" />
                Cetak Terpilih ({Object.values(checkedStudentIds).filter(v => v).length})
              </button>
            )}
`;

content = content.replace(
  /\{\/\* Bulk Edit Toggle \*\/\}/g,
  batchPrintBtnHtml + "\n\n            {/* Bulk Edit Toggle */}"
);

fs.writeFileSync('./src/components/ExcelGrid.tsx', content, 'utf-8');
console.log("Added Batch Print button to ExcelGrid");
