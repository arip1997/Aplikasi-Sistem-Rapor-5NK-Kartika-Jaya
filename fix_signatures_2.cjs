const fs = require('fs');
let content = fs.readFileSync('./src/components/RaporCetak.tsx', 'utf-8');

// I will just replace the "grid grid-cols-2" part to become a "relative" block where "Kepala Sekolah" is positioned absolute.
// But first, let's just find the Headmaster part:
//                       <div className="mt-8 flex flex-col items-center justify-center font-sans avoid-break">
//                         <p className="text-[10.5pt] font-semibold text-black mb-1 select-none">Mengetahui,</p>
//                         <p className="text-[10.5pt] text-black font-bold mb-2">Kepala Sekolah</p>

content = content.replace(
    /<div className="mt-8 flex flex-col items-center justify-center font-sans avoid-break">\s*<p className="text-\[10\.5pt\] font-semibold text-black mb-1 select-none">Mengetahui,<\/p>\s*<p className="text-\[10\.5pt\] text-black font-bold mb-2">Kepala Sekolah<\/p>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g,
    `{kopSekolah.enableSignatureHeadmaster && (
                      <div className="absolute top-[85px] left-1/2 transform -translate-x-1/2 flex flex-col items-center justify-center font-sans bg-white px-6 min-w-[240px] avoid-break">
                        <p className="text-[10.5pt] text-black font-bold mb-1">Kepala Sekolah</p>$1</div>
                    )}
                    </div>
                  </div>`
);

// We need to also change the parent block from grid-cols-2 to a relative block so that the absolute positioning works properly.
content = content.replace(
    /<div className="grid grid-cols-2 gap-12 text-center(?: text-sans)?">/g,
    `<div className="grid grid-cols-2 gap-12 text-center text-sans relative pb-10">`
);

fs.writeFileSync('./src/components/RaporCetak.tsx', content, 'utf-8');
console.log("Done");
