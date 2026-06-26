const fs = require('fs');
let content = fs.readFileSync('./src/components/RaporCetak.tsx', 'utf-8');

content = content.replace(
    /<\/div>\s*\{kopSekolah\.enableSignatureHeadmaster && \(\s*<div className="absolute top-\[85px\] left-1\/2 transform -translate-x-1\/2 flex flex-col items-center justify-center font-sans bg-white px-6 min-w-\[240px\] avoid-break">/g,
    `</div>
                      </div>
                      {kopSekolah.enableSignatureHeadmaster && (
                            <div className="absolute top-[85px] left-1/2 transform -translate-x-1/2 flex flex-col items-center justify-center font-sans bg-white px-6 min-w-[240px] avoid-break">`
);

fs.writeFileSync('./src/components/RaporCetak.tsx', content, 'utf-8');
console.log("Restored missing div");
