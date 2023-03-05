const fs = require('fs');
const path = require('path');

const dirPath = process.argv.slice(2)[0];
if (!dirPath) process.exit(1);

const dir = path.join(process.cwd(), dirPath);
if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
