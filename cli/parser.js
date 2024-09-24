const fs = require("fs");

function parseJsonObjects(str) {
  const jsonObjects = [];
  const lines = str.split('\n');
  for (let line of lines) {
    if (line.startsWith('JSON>')) {
      line = line.substring(6).trim();
    }
    if (line) {
      try {
        jsonObjects.push(JSON.parse(line));
      } catch (e) {
        // Ignore non-JSON lines
      }
    }
  }
  return jsonObjects;
}

// Extracts hole information from a JSON object
function extractHoleInfo(obj) {
  if (obj.kind === 'DisplayInfo' && obj.info && obj.info.kind === 'GoalSpecific') {
    const holeInfo = obj.info;
    return {
      type   : 'hole',
      id     : holeInfo.interactionPoint.id,
      range  : holeInfo.interactionPoint.range[0],
      goal   : holeInfo.goalInfo.type,
      context: holeInfo.goalInfo.entries
    };
  }
  return null;
}

// Extracts error information from a JSON object
function extractErrorInfo(obj) {
  if (obj.kind === 'DisplayInfo' && obj.info && (obj.info.error || obj.info.errors)) {
    let errors = [];
    
    if (obj.info.error) {
      // Single error case
      errors.push({
        type: 'error',
        message: obj.info.error.message
      });
    } else if (obj.info.errors) {
      // Multiple errors case
      errors = obj.info.errors.map(error => ({
        type: 'error',
        message: error.message
      }));
    }
    
    return errors;
  }
  return null;
}

// Gets all '{!!}' holes in an Agda file
function getFileHoles(filePath) {
  let holeId = 0;
  let holes = [];
  // Read the file content
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const lines = fileContent.split("\n");
  lines.forEach((line, index) => {
    const row = index + 1;
    const regex = /\{\!(.*?)\!\}/g;
    let match;
    while ((match = regex.exec(line)) !== null) {
      const col = match.index + 1;
      const content = match[1].trim() || "?";
      holes.push([holeId, row, col, content]);
      holeId++;
    }
  });
  return holes;
}

// Parses the output of the run command
function parseRunOutput(output, filePath) {
  const jsonObjects = parseJsonObjects(output);
  for (let obj of jsonObjects) {
    if (obj.kind === 'DisplayInfo' && obj.info && obj.info.kind === 'NormalForm') {
      return obj.info.expr;
    } else if (obj?.info?.kind === 'Error') {
      return obj.info.error;
    }
  }
  return "No output.";
}

module.exports = {
  parseJsonObjects,
  extractHoleInfo,
  extractErrorInfo,
  getFileHoles,
  parseRunOutput
}
