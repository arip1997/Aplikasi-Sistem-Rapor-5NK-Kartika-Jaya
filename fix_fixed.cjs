const fs = require('fs');

let content = fs.readFileSync('./src/components/GradeRecap.tsx', 'utf-8');
content = content.replace(/position: 'fixed'/g, "position: 'absolute'");
fs.writeFileSync('./src/components/GradeRecap.tsx', content, 'utf-8');
console.log('Fixed position in GradeRecap.tsx');
