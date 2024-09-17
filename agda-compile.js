#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const agdaFile = process.argv[2];
if (!agdaFile || !agdaFile.endsWith('.agda')) {
  console.error('Usage: agda-compile <agda-file.agda>');
  console.error('Please provide an Agda file (.agda) as an argument.');
  process.exit(1);
}

const baseName = path.basename(agdaFile, '.agda');
const dirName = path.dirname(agdaFile);
const fullPath = path.join(dirName, baseName);

try {
  // Compile Agda to executable
  console.log('Compiling Agda file...');
  execSync(`agda --compile --no-libraries --no-termination-check ${agdaFile}`, { stdio: 'inherit' });

  // Remove MAlonzo directory
  console.log('Removing MAlonzo directory...');
  fs.rmSync('MAlonzo', { recursive: true, force: true });

  // Move the compiled executable to the correct location if it's not already there
  if (dirName !== '.' && fs.existsSync(baseName)) {
    fs.renameSync(baseName, fullPath);
  }

  console.log(`Successfully compiled ${agdaFile} to ${fullPath}`);
  console.log(`You can now run the executable with: ${fullPath}`);
} catch (error) {
  console.error('An error occurred during compilation:', error.message);
  process.exit(1);
}

