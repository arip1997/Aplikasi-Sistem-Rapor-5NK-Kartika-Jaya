const fs = require('fs');
let content = fs.readFileSync('src/components/RaporCetak.tsx', 'utf-8');
content = content.replace(/border-collapse font-sans leading-snug/g, 'border-collapse font-sans leading-snug table-fixed');
fs.writeFileSync('src/components/RaporCetak.tsx', content);
console.log('Done');
