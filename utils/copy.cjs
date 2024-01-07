const fs = require('fs');
const path = require('path');

const [sourcePath, destinationPath] = process.argv.slice(2);
if (!sourcePath || !destinationPath) process.exit(1);

// Resolve the absolute paths
const sourceAbsolutePath = path.resolve(sourcePath);
const destinationAbsolutePath = path.resolve(destinationPath);

// Check if the source file exists
if (!fs.existsSync(sourceAbsolutePath)) {
  console.error('Source file does not exist');
  return;
}

// Check if the destination directory exists, create it if not
const destinationDirectory = path.dirname(destinationAbsolutePath);
if (!fs.existsSync(destinationDirectory)) {
  fs.mkdirSync(destinationDirectory, { recursive: true });
}

// Copy the file
fs.copyFileSync(sourceAbsolutePath, destinationAbsolutePath);
