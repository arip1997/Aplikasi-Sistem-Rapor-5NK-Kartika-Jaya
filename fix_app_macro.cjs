const fs = require('fs');
let content = fs.readFileSync('./src/App.tsx', 'utf-8');

content = content.replace(
  /waliKelasName=\{activeWaliKelas\.name\}\n\s*initialBatchNisList=\{batchPrintNisList\}\n\s*onClearStudentGrades/g,
  `waliKelasName={activeWaliKelas.name}
                    onClearStudentGrades`
);

content = content.replace(
  /onResetPrintStatus=\{handleResetPrintStatusOk\}\n\s*\/>\n\s*\)\}\n\s*\{\/\* SUBTAB 3/g,
  `onResetPrintStatus={handleResetPrintStatusOk}
                  />
                )}

                {/* SUBTAB 3`
);

fs.writeFileSync('./src/App.tsx', content, 'utf-8');
