const fs = require('fs');
let c = fs.readFileSync('frontend/vite.config.ts', 'utf8');

c = c.replace(/server: \{/, `server: {\n      allowedHosts: true,`);
fs.writeFileSync('frontend/vite.config.ts', c);
