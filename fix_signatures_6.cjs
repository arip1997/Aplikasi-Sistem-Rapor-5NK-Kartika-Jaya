const fs = require('fs');
let content = fs.readFileSync('./src/components/RaporCetak.tsx', 'utf-8');

// I'll grab the whole block from <div className="mt-4 avoid-break font-sans">
// all the way down to the closing tag of that div.

let matches = 0;
content = content.replace(/<div className="mt-4 avoid-break font-sans">([\s\S]*?)<p className="text-\[10\.5pt\] font-semibold text-black text-center mb-6 select-none">\s*Mengetahui,\s*<\/p>([\s\S]*?)(?:<div className="bg-white p-4|<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>|<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<div className="w-\[210mm\])/g, (match, before, after) => {
    // This is too fragile.
    return match;
});

// Since we know the line numbers and it's a mess now, let's revert RaporCetak.tsx to its original state using git checkout
// Wait, I don't know if git is available or if changes were committed.
