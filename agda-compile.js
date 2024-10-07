#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { platform } = require('node:process');

const agdaFile = process.argv[2];
if (!agdaFile || !agdaFile.endsWith('.agda')) {
  console.error('Usage: agda-compile <agda-file.agda>');
  console.error('Please provide an Agda file (.agda) as an argument.');
  process.exit(1);
}

const baseName = path.basename(agdaFile, '.agda');
const dirName = path.dirname(agdaFile);
const fullPath = path.join(dirName, baseName);

const fixF64command = platform == 'darwin'
  ? `find .build/MAlonzo/Code/Base/F64 -name "*.hs" -exec sed -i '' '/^module/a\\
import qualified MAlonzo.RTE.Float' {} +`
  : `find .build/MAlonzo/Code/Base/F64 -name "*.hs" -exec sed -i '/^module/a import qualified MAlonzo.RTE.Float' {} +`

const executeCompiled = (base) => {
  const buildPath = path.join('.build', base);
  if (fs.existsSync(buildPath)) {
    // Move the compiled executable from .build to the correct location
    fs.renameSync(buildPath, fullPath);
    console.log(`Successfully compiled ${agdaFile} to ${fullPath}`);
    console.log(`You can now run the executable with: ${fullPath}`);
  } else {
    console.error(`Compiled executable not found at ${buildPath}`);
    process.exit(1);
  }
}

try {
  // Compile Agda to executable
  console.log('Compiling Agda file...');
  execSync(`agda --compile --compile-dir=.build --no-libraries ${agdaFile}`, { stdio: 'inherit' });
  executeCompiled(baseName);
 } catch (error) {
    // TEMPORARY FIX TO F64 COMPILATION ERROR
    try {
      execSync(fixF64command)
      execSync(`agda --compile --compile-dir=.build --no-libraries ${agdaFile}`, { stdio: 'inherit' });
      executeCompiled(baseName);
      process.exit(0);
    } catch (error) {
      console.error('An error occurred during compilation:', error.message);
      process.exit(1);
    }
  console.error('An error occurred during compilation:', error.message);
  process.exit(1);
}
