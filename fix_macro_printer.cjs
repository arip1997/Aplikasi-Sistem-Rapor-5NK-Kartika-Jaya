const fs = require('fs');
let content = fs.readFileSync('./src/components/MacroPanel.tsx', 'utf-8');

content = content.replace(
  /Trash2, RotateCcw \} from 'lucide-react';/g,
  `Trash2, RotateCcw, Printer } from 'lucide-react';`
);

fs.writeFileSync('./src/components/MacroPanel.tsx', content, 'utf-8');
console.log('Imported Printer');
