const { spawn, execSync } = require("child_process");
const path = require("path");

const {
  simplifyAgdaOutput,
  formatHoleInfo,
  formatErrorInfo,
  readFileContent
} = require("./formatter");

const {
  parseJsonObjects,
  extractHoleInfo,
  extractErrorInfo,
  getFileHoles,
  parseRunOutput
} = require("./parser");

// Execute an Agda command and return the output as a Promise
function executeAgdaCommand(command) {
  return new Promise((resolve, reject) => {
    const agda = spawn("agda", ["--interaction-json",  "--no-allow-incomplete-matches", "--no-termination-check", "--no-libraries"]);
    let output = "";
    agda.stdout.on("data", (data) => output += data.toString());
    agda.stderr.on("data", (data) => console.error(`Agda Error: ${data}`));
    agda.on("close", (code) => {
    if (code !== 0) {
      reject(`Agda process exited with code ${code}`);
    } else {
      resolve(output);
    }
    });
    agda.stdin.write(command);
    agda.stdin.end();
  });
}

// Sends an Agda command and executes it
async function sendCommand(filePath, arg, quiet=false, interact=false) {
 return await executeAgdaCommand(`IOTCM "${filePath}" ${interact ? "Interactive" : "None"} Direct (${arg})\nx\n`);
}

// Checks the Agda file and prints hole information
async function agdaCheck(filePath) {
  var output = "";
  // Sends the Load command
  output += await sendCommand(filePath, `Cmd_load "${filePath}" []`) + "\n";

  // Iterate through holes and send Cmd_goal_type_context_infer command for each
  try {
    let holes = getFileHoles(filePath);
    for (const hole of holes) {
      let holeId = hole[0];
      let content = hole[3];
      if (holeId != null) {
        output += await sendCommand(filePath, `Cmd_goal_type_context_infer Normalised ${holeId} noRange "${content.trim()}"`) + "\n";
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
  return output;
}

// Runs the Agda program and returns the output
async function agdaRun(filePath) {
  var output = "";
  // Load the file first
  output += await sendCommand(filePath, `Cmd_load "${filePath}" []`) + "\n";
  // Then, execute the 'main' function
  output += await sendCommand(filePath, `Cmd_compute_toplevel DefaultCompute "main"`) + "\n";
  return output;
}

// This function processes Agda output to generate a pretty-printed result.
function prettyPrintOutput(out, filePath) {
  const jsonObjects = parseJsonObjects(out);
  const items = [];
  const seenErrors = new Set();
  for (let obj of jsonObjects) {
    const holeInfo = extractHoleInfo(obj);
    const errorInfo = extractErrorInfo(obj);
    if (holeInfo) {
      items.push(holeInfo);
    } else if (errorInfo) {
      errorInfo.forEach(error => {
        if (!seenErrors.has(error.message)) {
          items.push(error);
          seenErrors.add(error.message);
        }
      });
    }
  }

  // Generate pretty-printed output
  const fileContent = readFileContent(filePath);
  let prettyOut = '';
  let hasError = false;
  for (let item of items) {
    if (item.type === 'hole') {
      prettyOut += formatHoleInfo(item, fileContent);
    } else if (item.type === 'error') {
      hasError = true;
      prettyOut += formatErrorInfo(item, fileContent);
    }
    prettyOut += '\n';
  }

  if (hasError) {
    console.error(prettyOut.trim());
    process.exit(1);
  } else {
    console.log(simplifyAgdaOutput(prettyOut.trim()) || "Checked.");
  }
}

function getBackendCommand(ioBackend) {
  const backends = {
    "js": "agda-js",
    "hs": "agda-compile"
  };

  if (!ioBackend) {
    console.log("Defaulting to Haskell backend.");
    ioBackend = "hs";
  }

  if (!backends[ioBackend]) {
    console.error(`Unsupported backend: ${ioBackend}. Use 'js' or 'hs'.`);
    process.exit(1);
  }

  return backends[ioBackend];
}

function compileAgda(backendCommand, filePath) {
  execSync(`${backendCommand} ${filePath}`, { stdio: 'inherit' });
}

function runCompiledJs(compiledFileName) {
  execSync(`cd ${compiledFileName.toLowerCase()} && node main.js`, { stdio: 'inherit' });
}

function runCompiledHs(compiledFileName) {
  execSync(`./${compiledFileName}`, { stdio: 'inherit' });
}

function runIO(ioBackend, filePath) {
  const backendCommand = getBackendCommand(ioBackend);
  const compiledFileName = path.basename(filePath, '.agda');

  try {
    compileAgda(backendCommand, filePath);
    
    if (ioBackend === 'js') {
      runCompiledJs(compiledFileName);
    } else {
      runCompiledHs(compiledFileName);
    }
  } catch (error) {
    console.error('Error during compilation or execution:', error.message);
    process.exit(1);
  }
}

module.exports = {
  executeAgdaCommand,
  sendCommand,
  agdaCheck,
  agdaRun,
  prettyPrintOutput,
  getBackendCommand,
  compileAgda,
  runCompiledJs,
  runCompiledHs,
  runIO
}
