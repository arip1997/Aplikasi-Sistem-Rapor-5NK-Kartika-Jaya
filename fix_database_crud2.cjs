const fs = require('fs');

let content = fs.readFileSync('./src/components/DatabaseCrud.tsx', 'utf-8');

const headmasterInputsHTML = `
            {/* Fieldset Kepala Sekolah */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Nama Kepala Sekolah</label>
                <input
                  type="text"
                  value={editKop.namaKepalaSekolah || ''}
                  onChange={(e) => setEditKop({ ...editKop, namaKepalaSekolah: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="Contoh: Dra. Hj. Siti Aminah"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">NIP Kepala Sekolah</label>
                <input
                  type="text"
                  value={editKop.nipKepalaSekolah || ''}
                  onChange={(e) => setEditKop({ ...editKop, nipKepalaSekolah: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="Opsional"
                />
              </div>
            </div>
`;

content = content.replace(
  /<div>\s*<label className="block text-\[11px\] font-bold text-slate-600 mb-1">Tahun Ajaran<\/label>/g,
  headmasterInputsHTML + "\n            <div>\n              <label className=\"block text-[11px] font-bold text-slate-600 mb-1\">Tahun Ajaran</label>"
);

fs.writeFileSync('./src/components/DatabaseCrud.tsx', content, 'utf-8');
console.log("Added Kepala Sekolah string inputs.");
