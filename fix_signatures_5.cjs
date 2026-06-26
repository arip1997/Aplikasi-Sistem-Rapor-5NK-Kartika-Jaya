const fs = require('fs');
let content = fs.readFileSync('./src/components/RaporCetak.tsx', 'utf-8');

// The malformed block looks exactly like:
//                         </div>
//                           )}
//                         </div>
//                       </div>
// We need to add one more </div> before )}

content = content.replace(
    /<\/div>\s*\)\}\s*<\/div>\s*<\/div>/g,
    `</div>
                            </div>
                          )}
                        </div>
                      </div>`
);

fs.writeFileSync('./src/components/RaporCetak.tsx', content, 'utf-8');
console.log("Fixed missing div");
