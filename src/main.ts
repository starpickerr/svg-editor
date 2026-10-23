import { createInterface } from 'node:readline';
import { CliSession } from './cli/CliSession.js';

const session = new CliSession();
const repl = createInterface({ input: process.stdin, output: process.stdout,
  terminal: Boolean(process.stdin.isTTY), prompt: 'svg> ' });
console.log('svg-editor 0.1 — type \'init\' or \'read <file.svg>\' to start; \'help\' for commands');
repl.prompt();
repl.on('line', line => {
  for (const output of session.execute(line)) console.log(output);
  repl.prompt();
});
repl.on('close', () => { if (process.stdin.isTTY) console.log(); });
