const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8').split('\n');

for (let i = 0; i < code.length; i++) {
  if (code[i].includes('const user = getAuthenticatedUser(req);')) {
    code[i] = code[i].replace('const user = getAuthenticatedUser(req);', 'const user = await getAuthenticatedUser(req);');
  }
  
  if (code[i].includes('const authUser = getAuthenticatedUser(req);')) {
    code[i] = code[i].replace('const authUser = getAuthenticatedUser(req);', 'const authUser = await getAuthenticatedUser(req);');
  }

  if (i === 1880 || i === 1881) {
    let curr = i;
    while (curr >= 0) {
      let l = code[curr];
      if (l.match(/app\.(get|post|put|delete|patch|all)\(/) && !l.includes('async ')) {
          code[curr] = l.replace(/(app\.(?:get|post|put|delete|patch|all)\([^,]+,\s*(?:[^,]+,\s*)?)\(([^)]+)\)\s*=>\s*\{/, '$1async ($2) => {');
          break;
      }
      curr--;
    }
  }
}

fs.writeFileSync('server.ts', code.join('\n'), 'utf8');
console.log('Fixed TS async issues!');
