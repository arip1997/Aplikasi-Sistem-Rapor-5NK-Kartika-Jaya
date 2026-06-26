const fs = require('fs');

function fixImages(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Replace <img ... src={someUrl} ... /> with crossOrigin added if missing.
    // It's safer to just replace `referrerPolicy="no-referrer"` with `referrerPolicy="no-referrer" crossOrigin="anonymous"`
    // But wait, if it's a data URL, we don't need it.
    // Let's just blindly add crossOrigin="anonymous" to all images that don't have it.
    content = content.replace(/referrerPolicy="no-referrer"/g, (match, offset, str) => {
        // check if crossOrigin is already nearby
        let snippet = str.substring(offset, offset + 150);
        if (snippet.includes('crossOrigin')) {
            return match;
        }
        return `referrerPolicy="no-referrer" crossOrigin="anonymous"`;
    });

    fs.writeFileSync(filePath, content, 'utf-8');
}

fixImages('./src/components/RaporCetak.tsx');
fixImages('./src/components/GradeRecap.tsx');
console.log("Fixed images CORS.");
