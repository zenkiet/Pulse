/**
 * Cross-platform script to start the mock development environment
 * Detects the platform and runs the appropriate script
 */

const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

// Ensure logo files are properly copied to frontend/public/logos
function ensureLogoFiles() {
  console.log('Ensuring logo files are properly available in frontend...');
  
  const sourceDir = path.join(process.cwd(), 'public', 'logos');
  const targetDir = path.join(process.cwd(), 'frontend', 'public', 'logos');
  
  // Create target directory if it doesn't exist
  if (!fs.existsSync(targetDir)) {
    console.log('Creating frontend/public/logos directory...');
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  // Copy all PNG files from source to target
  if (fs.existsSync(sourceDir)) {
    const files = fs.readdirSync(sourceDir);
    let copyCount = 0;
    
    for (const file of files) {
      if (file.endsWith('.png')) {
        const sourcePath = path.join(sourceDir, file);
        const targetPath = path.join(targetDir, file);
        
        fs.copyFileSync(sourcePath, targetPath);
        copyCount++;
      }
    }
    
    console.log(`Copied ${copyCount} logo files to frontend/public/logos`);
  } else {
    console.warn('Warning: public/logos directory not found. Logo files may not be available.');
  }
}

// Ensure logo files are available before starting the development environment
ensureLogoFiles();

// Detect the platform
const isWindows = os.platform() === 'win32';

console.log(`Detected platform: ${os.platform()}`);
console.log(`Starting mock development environment on ${isWindows ? 'Windows' : 'Unix-like'} system...`);

// Define the command to run based on the platform
let command, args;

if (isWindows) {
  console.log('Running Windows mock start script...');
  command = path.join(process.cwd(), 'start-mock-dev.bat');
  args = [];
} else {
  console.log('Running Unix mock start script...');
  command = './start-mock-dev.sh';
  args = [];
}

// Spawn the process
const child = spawn(command, args, {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
});

// Handle process exit
child.on('exit', (code) => {
  console.log(`Mock development environment exited with code ${code}`);
  process.exit(code);
});

// Handle errors
child.on('error', (err) => {
  console.error('Failed to start mock development environment:', err);
  process.exit(1);
}); 