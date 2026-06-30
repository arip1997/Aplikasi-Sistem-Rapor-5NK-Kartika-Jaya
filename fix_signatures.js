const fs = require('fs');
let content = fs.readFileSync('src/components/RaporCetak.tsx', 'utf8');

content = content.replace(/border-b border-black pb-0\.5 inline-block whitespace-nowrap/g, 'block w-full border-b border-black pb-0.5 whitespace-nowrap min-h-[20px]');
content = content.replace(/border-b-\[1px\] border-black pb-0\.5 inline-block min-w-\[5\.0cm\] whitespace-nowrap/g, 'block w-full border-b border-black pb-0.5 whitespace-nowrap min-h-[20px]');
content = content.replace(/border-b-2 border-black pb-0\.5 inline-block min-w-\[5\.0cm\] min-h-\[20px\] whitespace-nowrap/g, 'block w-full border-b border-black pb-0.5 whitespace-nowrap min-h-[20px]');

fs.writeFileSync('src/components/RaporCetak.tsx', content, 'utf8');
console.log('Fixed signatures!');
