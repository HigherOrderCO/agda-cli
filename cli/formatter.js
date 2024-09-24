const fs = require("fs");

function simplifyAgdaOutput(output) {
  const modulePathRegex = /([A-Za-z0-9]+\.)+([A-Za-z0-9]+)(?=[\s\n])/g;
  return output.replace(modulePathRegex, (match) => {
    const parts = match.split('.');
    return parts[parts.length - 1];
  });
}

function formatHoleInfo(hole, fileContent) {
  const bold      = '\x1b[1m';
  const dim       = '\x1b[2m';
  const underline = '\x1b[4m';
  const reset     = '\x1b[0m';
  let result = `${bold}Goal: ${hole.goal}${reset}\n`;
  for (let entry of hole.context) {
    result += `- ${entry.originalName} : ${entry.binding}\n`;
  }
  
  result += `${dim}${underline}${hole.filePath}${reset}\n`;
  result += highlightCode(fileContent, hole.range.start.line, hole.range.start.col, hole.range.end.col - 1, hole.range.start.line, 'green');
  return simplifyAgdaOutput(result);
}

function formatErrorInfo(error, fileContent) {
  const prettifiedError = prettifyError(error.message);
  if (prettifiedError) {
    return prettifiedError + '\n' + extractCodeFromError(error.message, fileContent, 'red');
  } else {
    const bold      = '\x1b[1m';
    const dim       = '\x1b[2m';
    const underline = '\x1b[4m';
    const reset     = '\x1b[0m';
    let result = `${bold}Error:${reset} ${error.message}\n`;
    const fileInfo = error.message.split(':')[0];
    result += `${dim}${underline}${fileInfo}${reset}\n`;
    result += extractCodeFromError(error.message, fileContent, 'red');
    return result;
  }
}

function formatGoalsWarning(item, fileContent) {
  const bold = '\x1b[1m';
  const dim = '\x1b[2m';
  const underline = '\x1b[4m';
  const reset = '\x1b[0m';
  const yellow = '\x1b[33m';

  let result = '';

  if (item.type === 'goal') {
    let at = `${item.filePath} at ${item.range.start.line}:${item.range.start.col}`
    result += `${bold}Unsolved meta:${reset} ${item.expectedType}\n`;
    result += `${dim}${underline}${at}${reset}\n`;
    result += highlightCode(fileContent, item.range.start.line, item.range.start.col, item.range.end.col - 1, item.range.end.line, 'red');
  } else if (item.type === 'warning') {
    result += `${yellow}${bold}Warning:${reset} ${item.message}\n`;
    if (item.range) {
      result += `${dim}${underline}${filePath} at ${item.range.start.line}:${item.range.start.col}${reset}\n`;
      result += highlightCode(fileContent, item.range.start.line, item.range.start.col, item.range.end.col - 1, item.range.end.line, 'red');
    }
  }

  return result;
}

function prettifyError(errorMessage) {
  return prettify_TypeMismatch(errorMessage) || prettify_UnboundVariable(errorMessage);
}

function prettify_TypeMismatch(errorMessage) {
  const lines = errorMessage.split('\n');
  const fileInfo = lines[0].split(':')[0];
  
  const typeMismatchRegex = /(.+) (!=<|!=) (.+)/;
  const match = errorMessage.match(typeMismatchRegex);

  if (match) {
    const detected = match[1].trim();
    const expected = match[3].trim();
    const bold      = '\x1b[1m';
    const dim       = '\x1b[2m';
    const underline = '\x1b[4m';
    const reset     = '\x1b[0m';
    return `${bold}TypeMismatch:${reset}\n- expected: ${expected}\n- detected: ${detected}\n${dim}${underline}${fileInfo}${reset}`;
  }

  return null;
}

function prettify_UnboundVariable(errorMessage) {
  const notInScopeRegex = /Not in scope:\n\s+(\w+) at/;
  const match = errorMessage.match(notInScopeRegex);

  if (match) {
    const varName = match[1];
    const bold      = '\x1b[1m';
    const dim       = '\x1b[2m';
    const underline = '\x1b[4m';
    const reset     = '\x1b[0m';
    const fileInfo = errorMessage.split(':')[0];
    return `${bold}Unbound:${reset} '${varName}'\n${dim}${underline}${fileInfo}${reset}`;
  }

  return null;
}

function extractCodeFromError(errorMessage, fileContent, color) {
  const lines = errorMessage.split('\n');
  const fileInfo = lines[0].split(':');
  const errorFilePath = fileInfo[0];
  const match = lines[0].match(/(\d+),(\d+)-(?:(\d+),)?(\d+)/);
  
  if (match) {
    const iniLine = parseInt(match[1]);
    const iniCol  = parseInt(match[2]);
    const endLine = match[3] ? parseInt(match[3]) : iniLine;
    const endCol  = parseInt(match[4]);
    
    const errorFileContent = readFileContent(errorFilePath);
    return highlightCode(errorFileContent, iniLine, iniCol, endCol - 1, endLine, color);
  }

  return '';
}

function highlightCode(fileContent, startLine, startCol, endCol, endLine, color) {
  try {
    const lines = fileContent.split('\n');
    const dim       = '\x1b[2m';
    const reset     = '\x1b[0m';
    const underline = '\x1b[4m';
    const colorCode = color === 'red' ? '\x1b[31m' : '\x1b[32m';
    
    let result = '';
    const maxLineNumberLength = endLine.toString().length;
    for (let i = startLine - 1; i <= endLine - 1; i++) {
      const line = lines[i];
      const lineNumber = (i + 1).toString().padStart(maxLineNumberLength, ' ');
      result += `${dim}${lineNumber} | ${reset}`;
      if (i === startLine - 1 && i === endLine - 1) {
        result += dim + line.substring(0, startCol - 1);
        result += colorCode + underline + line.substring(startCol - 1, endCol) + reset;
        result += dim + line.substring(endCol) + reset + '\n';
      } else if (i === startLine - 1) {
        result += dim + line.substring(0, startCol - 1);
        result += colorCode + underline + line.substring(startCol - 1) + reset + '\n';
      } else if (i === endLine - 1) {
        result += colorCode + underline + line.substring(0, endCol) + reset;
        result += dim + line.substring(endCol) + reset + '\n';
      } else {
        result += colorCode + underline + line + reset + '\n';
      }
    }
    return result;
  } catch (e) {
    return fileContent;
  }
}

function readFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error('Error reading file:', error);
    return '';
  }
}

module.exports = {
  simplifyAgdaOutput,
  formatHoleInfo,
  formatErrorInfo,
  prettifyError,
  extractCodeFromError,
  highlightCode,
  readFileContent,
  formatGoalsWarning
};
