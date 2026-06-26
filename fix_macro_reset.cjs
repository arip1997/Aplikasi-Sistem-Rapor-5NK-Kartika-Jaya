const fs = require('fs');
let content = fs.readFileSync('./src/components/MacroPanel.tsx', 'utf-8');

content = content.replace(
  /onClearClassGrades: \(\) => void;/g,
  `onClearClassGrades: () => void;
  onResetPrintStatus: () => void;`
);

content = content.replace(
  /onClearClassGrades,\s*}: MacroPanelProps\) \{/g,
  `onClearClassGrades,
  onResetPrintStatus,
}: MacroPanelProps) {`
);

const resetPrintHtml = `
      {/* Utility Area */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Printer className="h-4 w-4 text-slate-500" /> Utility Pencetakan
        </h4>
        <div className="flex flex-col gap-3">
          <p className="text-xs text-slate-500 leading-relaxed">
            Status cetak menandai siswa dengan ikon printer di ExcelGrid setelah PDF-nya berhasil dibuat atau diunduh massal.
          </p>
          <button
            onClick={() => {
              if (confirm('Yakin ingin mereset/menghapus tanda Status Cetak untuk seluruh siswa di kelas ini?')) {
                onResetPrintStatus();
              }
            }}
            className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg text-[11px] font-bold transition-all border border-slate-300"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Status Cetak Kelas
          </button>
        </div>
      </div>
`;

content = content.replace(
  /\{\/\* Danger Zone \*\/\}/g,
  resetPrintHtml + "\n\n      {/* Danger Zone */}"
);

fs.writeFileSync('./src/components/MacroPanel.tsx', content, 'utf-8');
console.log('MacroPanel updated for reset print status');
