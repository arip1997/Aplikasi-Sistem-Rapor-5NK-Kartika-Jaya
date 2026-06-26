const fs = require('fs');

let content = fs.readFileSync('./src/components/DatabaseCrud.tsx', 'utf-8');

const headmasterSignatureHTML = `
                  {/* Tanda Tangan Kepala Sekolah */}
                  <div className="bg-white p-4 border border-slate-200 rounded-lg flex flex-col gap-2">
                    <span className="font-bold text-slate-600 block mb-1">Tanda Tangan Kepala Sekolah</span>
                    <div className="flex items-center gap-3">
                      {editKop.signatureHeadmasterUrl ? (
                        <div className="relative">
                          <img src={editKop.signatureHeadmasterUrl} alt="Tanda Tangan Kepala Sekolah" className="w-20 h-16 object-contain bg-slate-50 rounded border border-slate-200" />
                          <button
                            type="button"
                            onClick={() => setEditKop({ ...editKop, signatureHeadmasterUrl: '' })}
                            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center shadow-md hover:scale-105 transition-transform font-bold text-[10px] cursor-pointer"
                            title="Hapus"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="w-20 h-16 bg-slate-100 border border-dashed border-slate-300 rounded flex items-center justify-center text-slate-400 font-mono text-[9px] text-center px-1">KOSONG</div>
                      )}
                      <div className="flex-1 flex flex-col gap-1.5">
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setEditKop({ ...editKop, signatureHeadmasterUrl: reader.result as string });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-[10px] file:py-0.5 file:px-2 file:bg-emerald-50 file:text-emerald-700 file:border-0 file:rounded file:text-[10px] file:font-semibold"
                        />
                        <span className="text-[10px] text-slate-400 block">PNG transparan direkomendasikan.</span>
                      </div>
                    </div>
                  </div>
`;

content = content.replace(
  /\{\/\* Tanda Tangan Orang Tua \*\/\}/g,
  headmasterSignatureHTML + "\n                  {/* Tanda Tangan Orang Tua */}"
);

fs.writeFileSync('./src/components/DatabaseCrud.tsx', content, 'utf-8');
console.log("Added Kepala Sekolah signature upload.");
