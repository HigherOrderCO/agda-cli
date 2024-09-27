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
  execSync(`agda --compile --compile-dir=.build --no-libraries ${agdaFile}`, { stdio: 'inherit' });

  // Move the compiled executable from .build to the correct location
  const buildPath = path.join('.build', baseName);
  if (fs.existsSync(buildPath)) {
    fs.renameSync(buildPath, fullPath);
    console.log(`Successfully compiled ${agdaFile} to ${fullPath}`);
    console.log(`You can now run the executable with: ${fullPath}`);
  } else {
    console.error(`Compiled executable not found at ${buildPath}`);
    process.exit(1);
  }
} catch (error) {
  console.error('An error occurred during compilation:', error.message);
  process.exit(1);
}
