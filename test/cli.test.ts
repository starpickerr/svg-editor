import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { CliSession } from '../src/cli/CliSession.js';

test('CLI parses quotes, colors, comments and all shape parameters without losing text', () => {
  const cli = new CliSession();
  assert.deepEqual(cli.execute('tree'), ["error: no document. use 'init' or 'read' first"]);
  assert.deepEqual(cli.execute('  # comment'), []);
  assert.deepEqual(cli.execute('init'), ['canvas 800x600 created']);
  for (const command of [
    'create g scene', 'create rect r 1.5 -2 3 4 #eee in scene',
    'create circle c 1 2 3 red', 'create ellipse e 1 2 3 4', 'create line l 1 2 3 4 black',
    'create text t 2 3 "hello \\"world\\" 世界" in scene',
  ]) assert.ok(!cli.execute(command)[0]!.startsWith('error:'), command);
  assert.match(cli.execute('tree scene')[0]!, /rect#r.*x=1.5.*y=-2.*w=3/);
  assert.match(cli.execute('show t')[0]!, /text="hello \\"world\\" 世界"/);
  assert.deepEqual(cli.execute('set t text ""'), ['text#t updated: text=""']);
  assert.match(cli.execute('show t')[0]!, /text=""/);
  assert.match(cli.execute('help')[0]!, /create <type> <id>/);
  assert.match(cli.execute('help')[0]!, /create ellipse <id> <cx> <cy> <rx> <ry> \[fill\]/);
});

test('CLI covers editing, history, container errors and failed-command atomicity', () => {
  const cli = new CliSession(); cli.execute('init'); cli.execute('create g scene');
  cli.execute('create rect a 1 2 3 4 in scene'); cli.execute('create circle b 5 6 7 in scene');
  const before = cli.execute('tree');
  assert.deepEqual(cli.execute('group bad a scene'), ['error: cannot group a container into its own descendant: scene']);
  assert.deepEqual(cli.execute('tree'), before);
  cli.execute('group pair b a'); cli.execute('move pair 10 20'); cli.execute('scale pair 2');
  assert.match(cli.execute('show a')[0]!, /x=22/);
  cli.execute('undo'); cli.execute('redo'); cli.execute('ungroup pair');
  cli.execute('addto scene b'); cli.execute('front a'); cli.execute('back a');
  cli.execute('set a fill red'); cli.execute('set a width 10');
  assert.match(cli.execute('show a')[0]!, /width=10/);
  cli.execute('delete scene'); assert.equal(cli.execute('tree')[0], 'svg (800x600)');
  cli.execute('undo'); assert.match(cli.execute('tree')[0]!, /rect#a/);
  for (const [command, expected] of [
    ['create rect a 0 0 1 1', 'id already exists: a'],
    ['create g child in missing', 'no such container: missing'],
    ['create g child in a', 'not a container: a'],
    ['set a id another', 'unknown attribute: id'], ['scale a 0', 'scale factor must be positive'],
    ['ungroup scene', 'cannot ungroup top-level container: scene'],
    ['create box x', 'unknown shape type: box (is the plugin loaded?)'],
    ['move a nope 0', 'invalid number: nope'], ['create text x 0 0 "oops', 'unterminated double quote'],
  ]) assert.deepEqual(cli.execute(command!), [`error: ${expected}`]);
  cli.execute('redo'); // A failed edit must not discard the redo of delete.
  assert.equal(cli.execute('tree')[0], 'svg (800x600)');
});

test('read/save/canvas preserve state on failure and establish barriers only on success', () => {
  const directory = mkdtempSync(join(tmpdir(), 'svg-cli-'));
  try {
    const path = join(directory, 'input with space.svg');
    writeFileSync(path, '<svg width="200" height="100"><rect width="4" height="5"/></svg>');
    const cli = new CliSession();
    assert.deepEqual(cli.execute(`read "${path}"`), [
      'warning: assigned id rect1 to unnamed <rect>', `read ${path} (1 elements)`,
    ]);
    assert.deepEqual(cli.execute('undo'), ['error: undo not allowed after io command']);
    cli.execute('move rect1 10 20');
    const before = cli.execute('tree');
    const invalid = join(directory, 'invalid.svg');
    writeFileSync(invalid, '<svg><rect/><circle r="-1"/></svg>');
    assert.deepEqual(cli.execute(`read "${invalid}"`), [`error: cannot read file: ${invalid}`]);
    assert.deepEqual(cli.execute(`read "${directory}/missing.svg"`), [`error: cannot read file: ${directory}/missing.svg`]);
    assert.deepEqual(cli.execute(`save "${directory}/missing/file.svg"`), [`error: cannot write file: ${directory}/missing/file.svg`]);
    assert.deepEqual(cli.execute('canvas -1 2'), ['error: canvas width must be positive']);
    assert.deepEqual(cli.execute('tree'), before);
    cli.execute('canvas'); cli.execute('help'); cli.execute('show rect1');
    cli.execute('undo'); assert.match(cli.execute('show rect1')[0]!, /x=0/);
    cli.execute('redo'); cli.execute('save');
    assert.match(readFileSync(path, 'utf8'), /x="10"/);
    assert.deepEqual(cli.execute('redo'), ['error: undo not allowed after io command']);
    cli.execute('canvas 300 150'); assert.deepEqual(cli.execute('canvas'), ['canvas 300x150']);
    cli.execute('create g next'); cli.execute('undo');
    assert.doesNotMatch(cli.execute('tree')[0]!, /g#next/);
    cli.execute('init'); assert.deepEqual(cli.execute('save'), ["error: no file path. use 'save <file.svg>'"]);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('actual REPL accepts a script, prints prompts and continues after an error', () => {
  const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/main.ts'], {
    input: '# replay\ninit 100 80\ncreate circle c 10 20 5 red\nmove missing 1 1\ntree\n', encoding: 'utf8',
  });
  assert.equal(result.status, 0); assert.equal(result.stderr, '');
  assert.match(result.stdout, /svg> /); assert.match(result.stdout, /error: no such shape: missing/);
  assert.match(result.stdout, /svg \(100x80\)/); assert.match(result.stdout, /circle#c.*cx=10.*cy=20.*r=5/);
});
