const fs = require('fs');
let content = fs.readFileSync('./src/components/RaporCetak.tsx', 'utf-8');

// Replace the signature block.
// Let's find the exact string bounds.

const signatureBlockRegex = /<div className="mt-4 avoid-break[^>]*>\s*<p className="text-\[10\.5pt\] font-semibold text-black text-center mb-6 select-none">\s*Mengetahui,\s*<\/p>[\s\S]*?(?:Kepala Sekolah[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>)/g;

let matches = content.match(signatureBlockRegex);
if (!matches) {
    console.log("No matches found!");
} else {
    console.log(`Found ${matches.length} matches.`);
}

let replacedContent = content.replace(/<div className="mt-4 avoid-break( font-sans)?">\s*<p className="text-\[10\.5pt\] font-semibold text-black text-center mb-6 select-none">\s*Mengetahui,\s*<\/p>\s*<div className="grid grid-cols-2 gap-12 text-center( text-sans)?">\s*\{\/\* Orang Tua \*\/\}\s*<div className="flex flex-col items-center justify-between h-32 relative">\s*<p className="text-\[10\.5pt\] text-black font-bold select-none">Orang Tua \/ Wali<\/p>\s*<div className="h-16 flex items-center justify-center relative w-full">\s*\{kopSekolah\.signatureParentUrl \? \(\s*<img\s*src=\{kopSekolah\.signatureParentUrl\}\s*alt="Tanda Tangan Orang Tua"\s*className="max-h-16 max-w-\[180px\] object-contain"\s*referrerPolicy="no-referrer"\s*\/>\s*\) : \(\s*<div className="h-4"><\/div>\s*\)\}\s*<\/div>\s*<div className="flex flex-col items-center w-full">\s*<div className="w-48 border-b-\[1\.5px\] border-black pb-0\.5"><\/div>\s*<p className="text-\[8pt\] text-slate-500 font-sans mt-1 italic select-none">Tanda Tangan & Nama Terang<\/p>\s*<\/div>\s*<\/div>\s*\{\/\* Guru Kelas \*\/\}\s*<div className="flex flex-col items-center justify-between h-32 relative">\s*<p className="text-\[10\.5pt\] text-black font-bold">Guru Kelas \/ Wali Kelas<\/p>\s*<div className="h-16 flex items-center justify-center relative w-full">\s*\{kopSekolah\.signatureTeacherUrl \? \(\s*<img\s*src=\{kopSekolah\.signatureTeacherUrl\}\s*alt="Tanda Tangan Guru"\s*className="max-h-16 max-w-\[180px\] object-contain"\s*referrerPolicy="no-referrer"\s*\/>\s*\) : \(\s*<div className="h-4"><\/div>\s*\)\}\s*<\/div>\s*<div className="flex flex-col items-center w-full font-sans">\s*<p className="font-bold text-black text-\[10\.5pt\] text-center leading-tight select-all underline underline-offset-4 decoration-\[1\.5px\]">\s*\{getWaliKelas\(.*?\)\.name \|\| '____________________'\}\s*<\/p>\s*\{getWaliKelas\(.*?\)\.nip && getWaliKelas\(.*?\)\.nip\.trim\(\) !== '' && getWaliKelas\(.*?\)\.nip\.trim\(\) !== '-' \? \(\s*<p className="text-\[8\.5pt\] text-slate-700 font-mono mt-1 select-all">\s*NIP\. \{getWaliKelas\(.*?\)\.nip\}\s*<\/p>\s*\) : \(\s*<p className="text-\[8pt\] text-slate-500 font-sans mt-0\.5 italic select-none">Tanda Tangan & Nama Terang<\/p>\s*\)\}\s*<\/div>\s*<\/div>\s*<\/div>\s*<div className="mt-8 flex flex-col items-center justify-center font-sans avoid-break">\s*(<p className="text-\[10\.5pt\] font-semibold text-black mb-1 select-none">Mengetahui,<\/p>\s*)?<p className="text-\[10\.5pt\] text-black font-bold mb-2">Kepala Sekolah<\/p>\s*<div className="h-16 flex items-center justify-center relative w-full mb-1">\s*\{kopSekolah\.signatureHeadmasterUrl \? \(\s*<img\s*src=\{kopSekolah\.signatureHeadmasterUrl\}\s*alt="Tanda Tangan Kepala Sekolah"\s*className="max-h-16 max-w-\[180px\] object-contain"\s*referrerPolicy="no-referrer"\s*\/>\s*\) : \(\s*<div className="h-4"><\/div>\s*\)\}\s*<\/div>\s*<div className="flex flex-col items-center min-w-\[220px\]">\s*<p className="font-bold text-black text-\[10\.5pt\] text-center leading-tight select-all underline underline-offset-4 decoration-\[1\.5px\]">\s*\{kopSekolah\.namaKepalaSekolah \|\| '____________________'\}\s*<\/p>\s*\{kopSekolah\.nipKepalaSekolah \? \(\s*<p className="text-\[8\.5pt\] text-slate-700 font-mono mt-1 select-all">\s*NIP\. \{kopSekolah\.nipKepalaSekolah\}\s*<\/p>\s*\) : \(\s*<p className="text-\[8pt\] text-slate-500 font-sans mt-0\.5 italic select-none">Tanda Tangan & Nama Terang<\/p>\s*\)\}\s*<\/div>\s*<\/div>\s*<\/div>/g, 
(match, p1, p2, activeStudent1, activeStudent2, activeStudent3, activeStudent4, activeStudent5, p3) => {
    
    // Extracted the exact student variable name used here (either activeStudent or selSt)
    const stVar = activeStudent1 || 'activeStudent';

    return `<div className="mt-4 avoid-break font-sans">
                        <p className="text-[10.5pt] font-semibold text-black text-center mb-6 select-none">
                          Mengetahui,
                        </p>
                        <div className="relative text-center pb-2">
                          <div className="flex justify-between items-start gap-12 text-center w-full">
                            {/* Orang Tua */}
                            <div className="flex flex-col items-center justify-between h-32 relative w-1/2">
                              <p className="text-[10.5pt] text-black font-bold select-none">Orang Tua / Wali</p>
                              <div className="h-16 flex items-center justify-center relative w-full">
                                {kopSekolah.signatureParentUrl ? (
                                  <img
                                    src={kopSekolah.signatureParentUrl}
                                    alt="Tanda Tangan Orang Tua"
                                    className="max-h-16 max-w-[180px] object-contain"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="h-4"></div>
                                )}
                              </div>
                              <div className="flex flex-col items-center w-full">
                                <div className="w-48 border-b-[1.5px] border-black pb-0.5"></div>
                                <p className="text-[8pt] text-slate-500 font-sans mt-1 italic select-none">Tanda Tangan & Nama Terang</p>
                              </div>
                            </div>

                            {/* Guru Kelas */}
                            <div className="flex flex-col items-center justify-between h-32 relative w-1/2">
                              <p className="text-[10.5pt] text-black font-bold">Guru Kelas / Wali Kelas</p>
                              <div className="h-16 flex items-center justify-center relative w-full">
                                {kopSekolah.signatureTeacherUrl ? (
                                  <img
                                    src={kopSekolah.signatureTeacherUrl}
                                    alt="Tanda Tangan Guru"
                                    className="max-h-16 max-w-[180px] object-contain"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="h-4"></div>
                                )}
                              </div>
                              <div className="flex flex-col items-center w-full font-sans">
                                <p className="font-bold text-black text-[10.5pt] text-center leading-tight select-all underline underline-offset-4 decoration-[1.5px]">
                                  {getWaliKelas(${stVar}).name || '____________________'}
                                </p>
                                {getWaliKelas(${stVar}).nip && getWaliKelas(${stVar}).nip.trim() !== '' && getWaliKelas(${stVar}).nip.trim() !== '-' ? (
                                  <p className="text-[8.5pt] text-slate-700 font-mono mt-1 select-all">
                                    NIP. {getWaliKelas(${stVar}).nip}
                                  </p>
                                ) : (
                                  <p className="text-[8pt] text-slate-500 font-sans mt-0.5 italic select-none">Tanda Tangan & Nama Terang</p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Kepala Sekolah */}
                          {kopSekolah.enableSignatureHeadmaster && (
                              <div className="absolute top-[85px] left-1/2 transform -translate-x-1/2 flex flex-col items-center justify-center font-sans bg-white px-6 w-[240px]">
                                <p className="text-[10.5pt] text-black font-bold mb-1">Kepala Sekolah</p>
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
                                <div className="flex flex-col items-center w-full">
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
                          )}
                        </div>
                      </div>`;
});

console.log("Replacements done: ", replacedContent !== content);
fs.writeFileSync('./src/components/RaporCetak.tsx', replacedContent, 'utf-8');
