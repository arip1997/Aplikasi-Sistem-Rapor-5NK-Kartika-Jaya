const fs = require('fs');
let content = fs.readFileSync('./src/components/RaporCetak.tsx', 'utf-8');

// The structure is:
// <div className="grid grid-cols-2 gap-12 text-center( text-sans)?">
//    ... Orang Tua
//    ... Guru Kelas
// </div>
// <div className="mt-8 flex flex-col items-center justify-center font-sans avoid-break">
//    <p className="text-[10.5pt] font-semibold text-black mb-1 select-none">Mengetahui,</p>
//    <p className="text-[10.5pt] text-black font-bold mb-2">Kepala Sekolah</p>
//    ...
// </div>
// </div>

const combinedRegex = /<\/div>\s*<div className="mt-8 flex flex-col items-center justify-center font-sans avoid-break">\s*(?:<p className="text-\[10\.5pt\] font-semibold text-black mb-1 select-none">Mengetahui,<\/p>\s*)?<p className="text-\[10\.5pt\] text-black font-bold mb-2">Kepala Sekolah<\/p>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;

content = content.replace(combinedRegex, (match, inner) => {
    return `{kopSekolah.enableSignatureHeadmaster && (
                            <div className="absolute top-[85px] left-1/2 transform -translate-x-1/2 flex flex-col items-center justify-center font-sans bg-white px-6 min-w-[240px] avoid-break">
                              <p className="text-[10.5pt] text-black font-bold mb-1">Kepala Sekolah</p>${inner}</div>
                          )}
                        </div>
                      </div>`;
});

content = content.replace(
    /<div className="grid grid-cols-2 gap-12 text-center(?: text-sans)?">/g,
    `<div className="grid grid-cols-2 gap-12 text-center text-sans relative pb-10">`
);

fs.writeFileSync('./src/components/RaporCetak.tsx', content, 'utf-8');
console.log("Done replace");
