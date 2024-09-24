#!/usr/bin/env node

const path = require("path");
const {
  agdaCheck,
  agdaRun,
  prettyPrintOutput,
  runIO,
} = require("./cli/agda-commands");

const {
  parseRunOutput
} = require("./cli/parser");


const command = process.argv[2];
const filePath = process.argv[3];
let ioBackend = process.argv[4];

async function main() {
  if (!filePath || !filePath.endsWith(".agda")) {
    console.error("Usage: agda-cli [check|run|runIO] <file.agda>");
    process.exit(1);
  }

  switch (command) {
    case "check": {
      const output = await agdaCheck(filePath);
      prettyPrintOutput(output, filePath);
      break;
    }
    case "run": {
      const output = await agdaRun(filePath);
      const result = parseRunOutput(output);
      console.log(result);
      break;
    }
    case "runIO": {
      runIO(ioBackend, filePath);
      break;
    }
    default: {
      console.error("Invalid command. Use 'check' or 'run' or 'runIO'.");
      process.exit(1);
    }
  }
}

(async () => await main())();
