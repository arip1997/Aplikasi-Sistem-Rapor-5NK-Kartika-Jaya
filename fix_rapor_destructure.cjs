const fs = require('fs');
let content = fs.readFileSync('./src/components/RaporCetak.tsx', 'utf-8');

content = content.replace(
  /waliKelasName,\n\s*waliKelasNip/g,
  `waliKelasName,
  initialBatchNisList,
  waliKelasNip`
);

fs.writeFileSync('./src/components/RaporCetak.tsx', content, 'utf-8');
