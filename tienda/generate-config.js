// Genera config.js desde variables de entorno (Vercel/Netlify: Build Command = node generate-config.js)
const fs = require('fs');
require('fs').existsSync('.env') && fs.readFileSync('.env','utf8').split('\n').forEach(l => {
  const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
const { SUPABASE_URL = '', SUPABASE_KEY = '', LOOKER_URL = '' } = process.env;
fs.writeFileSync('config.js', `window.CONFIG = ${JSON.stringify({ SUPABASE_URL, SUPABASE_KEY, LOOKER_URL })};\n`);
console.log('config.js generado');
