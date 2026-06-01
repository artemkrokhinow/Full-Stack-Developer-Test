const fs = require('fs');
const { spawn } = require('child_process');

console.log('--- PXXL ROOT PROXY START ---');

let target = null;
if (fs.existsSync('./frontend/dist')) {
  target = 'frontend';
} else if (fs.existsSync('./backend/dist')) {
  target = 'backend';
}

if (!target) {
  console.error("CRITICAL ERROR: No 'dist' folder found in frontend or backend.");
  console.error("This means the build phase failed to output to 'dist' or the files weren't synced.");
  process.exit(1);
}

console.log(`Detected compiled project in './${target}/dist'.`);
console.log(`Routing 'npm start' to './${target}' directory...`);

const child = spawn('npm', ['start'], { cwd: `./${target}`, stdio: 'inherit', shell: true });

child.on('error', (err) => {
  console.error(`Failed to start subprocess: ${err}`);
  process.exit(1);
});

child.on('close', (code) => {
  console.log(`Subprocess exited with code ${code}`);
  process.exit(code);
});
