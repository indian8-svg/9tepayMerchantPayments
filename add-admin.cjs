const fs = require('fs');
let c = fs.readFileSync('backend/server.ts', 'utf8');

const regex = /if \(role === "admin" \|\| targetEmail === "admin@demotry\.shop" \|\| targetEmail === "admin@9tepay\.com"\) \{/g;
const replacement = `if (role === "admin" || targetEmail === "admin@demotry.shop" || targetEmail === "admin@9tepay.com" || targetEmail === "abhaylucknow12@gmail.com") {`;

c = c.replace(regex, replacement);
fs.writeFileSync('backend/server.ts', c);
