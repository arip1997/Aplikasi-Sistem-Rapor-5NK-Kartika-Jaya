const fs = require('fs');
let content = fs.readFileSync('src/components/RaporCetak.tsx', 'utf8');

content = content.replace(/<tr/g, '<tr className="avoid-break"');
// Now we might have <tr className="avoid-break" className="..."
content = content.replace(/<tr className="avoid-break"([^>]*)className="([^"]*)"/g, '<tr $1 className="avoid-break $2"');
content = content.replace(/<tr className="avoid-break"([^>]*)className='([^']*)'/g, '<tr $1 className=\'avoid-break $2\'');
// Remove duplicates like className="avoid-break avoid-break"
content = content.replace(/avoid-break avoid-break/g, 'avoid-break');

fs.writeFileSync('src/components/RaporCetak.tsx', content, 'utf8');
