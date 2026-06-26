const fs = require('fs');
let content = fs.readFileSync('./src/components/RaporCetak.tsx', 'utf-8');

const headmasterHTML = `
                      <div className="mt-8 flex flex-col items-center justify-center font-sans avoid-break">
                        <p className="text-[10.5pt] font-semibold text-black mb-1 select-none">Mengetahui,</p>
                        <p className="text-[10.5pt] text-black font-bold mb-2">Kepala Sekolah</p>
                        <div className="h-16 flex items-center justify-center relative w-full mb-1">
                          {kopSekolah.signatureHeadmasterUrl ? (
                            <img
                              src={kopSekolah.signatureHeadmasterUrl}
                              alt="Tanda Tangan Kepala Sekolah"
                              className="max-h-16 max-w-[180px] object-contain"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="h-4"></div>
                          )}
                        </div>
                        <div className="flex flex-col items-center min-w-[220px]">
                          <p className="font-bold text-black text-[10.5pt] text-center leading-tight select-all underline underline-offset-4 decoration-[1.5px]">
                            {kopSekolah.namaKepalaSekolah || '____________________'}
                          </p>
                          {kopSekolah.nipKepalaSekolah ? (
                            <p className="text-[8.5pt] text-slate-700 font-mono mt-1 select-all">
                              NIP. {kopSekolah.nipKepalaSekolah}
                            </p>
                          ) : (
                            <p className="text-[8pt] text-slate-500 font-sans mt-0.5 italic select-none">Tanda Tangan & Nama Terang</p>
                          )}
                        </div>
                      </div>
`;

// There are multiple places where signatures are rendered (page 1, page 2).
// Let's replace `</div>\n                    </div>\n                  </div>\n\n                </div>\n              </div>\n            </div>` with the headmaster included.

// Find the signature block closing
content = content.replace(/\{\/\* Guru Kelas \*\/\}([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/g, 
  `{/* Guru Kelas */}$1</div>\n                      </div>\n` + headmasterHTML + `\n                    </div>\n                  </div>`
);

fs.writeFileSync('./src/components/RaporCetak.tsx', content, 'utf-8');
console.log("Added Kepala Sekolah signature to RaporCetak");
