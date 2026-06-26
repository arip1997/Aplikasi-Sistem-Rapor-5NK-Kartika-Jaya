const fs = require('fs');
let content = fs.readFileSync('./src/App.tsx', 'utf-8');

content = content.replace(
  /const \[autoPrintImmediately, setAutoPrintImmediately\] = useState<boolean>\(false\);/g,
  `const [autoPrintImmediately, setAutoPrintImmediately] = useState<boolean>(false);
  const [batchPrintNisList, setBatchPrintNisList] = useState<string[]>([]);`
);

content = content.replace(/handleResetPrintStatus/g, 'handleResetPrintStatusOk');
content = content.replace(/handleResetPrintStatusOkOk/g, 'handleResetPrintStatusOk');

fs.writeFileSync('./src/App.tsx', content, 'utf-8');
