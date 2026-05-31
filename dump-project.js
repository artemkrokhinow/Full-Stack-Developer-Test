const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const OUT_FILE = path.join(ROOT_DIR, 'project-source.txt');

const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.gemini'];
const ALLOWED_EXTENSIONS = ['.ts', '.tsx', '.json', '.prisma', '.md', '.env.example', '.css', '.html'];

function walkSync(currentDirPath, callback) {
    fs.readdirSync(currentDirPath).forEach(function (name) {
        const filePath = path.join(currentDirPath, name);
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
            callback(filePath, stat);
        } else if (stat.isDirectory()) {
            if (!IGNORE_DIRS.includes(name)) {
                walkSync(filePath, callback);
            }
        }
    });
}

let content = '=========================================\n';
content += '       FULL STACK DEVELOPER TEST         \n';
content += '=========================================\n\n';

walkSync(ROOT_DIR, function (filePath) {
    const ext = path.extname(filePath);
    const fileName = path.basename(filePath);
    
    // Ignore lock files
    if (fileName === 'package-lock.json' || fileName === 'yarn.lock') return;
    
    if (ALLOWED_EXTENSIONS.includes(ext) || fileName === '.env.example') {
        const relativePath = path.relative(ROOT_DIR, filePath);
        const fileData = fs.readFileSync(filePath, 'utf8');
        
        content += `\n\n--------------------------------------------------\n`;
        content += `FILE: ${relativePath}\n`;
        content += `--------------------------------------------------\n\n`;
        content += fileData;
    }
});

fs.writeFileSync(OUT_FILE, content);
console.log(`✅ Project successfully dumped to ${OUT_FILE}`);
