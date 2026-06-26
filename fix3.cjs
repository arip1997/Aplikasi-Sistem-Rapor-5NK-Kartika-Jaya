const fs = require('fs');
let content = fs.readFileSync('./src/components/RaporCetak.tsx', 'utf-8');

// I will just replace the exact line 2366 `    )) : (` with `    ) : (`
content = content.replace(/    \)\) : \(/, '          ) : (');

fs.writeFileSync('./src/components/RaporCetak.tsx', content, 'utf-8');
console.log("Fixed syntax error");
