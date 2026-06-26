const fs = require('fs');
let content = fs.readFileSync('./src/components/RaporCetak.tsx', 'utf-8');

const snippet = `                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )) : (`;

const replace = `                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
    )) : (`;

content = content.replace(snippet, replace);

fs.writeFileSync('./src/components/RaporCetak.tsx', content, 'utf-8');
console.log("Fixed block 3");
