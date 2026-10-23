import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SvgCodec } from '../src/svg/SvgCodec.js';
import { SvgFileStore } from '../src/svg/SvgFileStore.js';

test('SVG import reserves explicit ids before assignment and round-trips nested shapes and XML text', () => {
  const codec = new SvgCodec();
  const result = codec.parse(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
    <rect x="1.5" y="2" width="3" height="4"/><g id="g1" fill="red" transform="translate(2,3)">
    <text x="10" y="20" font-size="14">世界 &amp; &lt;"hi"&gt;</text><rect id="rect1" width="5" height="6"/>
    <circle id="c" cx="2" cy="3" r="4"/><ellipse id="e" cx="1" cy="2" rx="3" ry="4"/>
    <line id="l" x1="1" y1="2" x2="3" y2="4" stroke="black"/></g></svg>`);
  assert.deepEqual(result.warnings, [
    'warning: assigned id rect2 to unnamed <rect>', 'warning: assigned id text1 to unnamed <text>',
  ]);
  assert.equal(result.document.find('text1').text, '世界 & <"hi">');
  const xml = codec.serialize(result.document);
  assert.match(xml, /&amp;/); assert.match(xml, /&lt;/);
  assert.equal(result.document.find('rect2').attributes().fill, undefined);
  const reread = codec.parse(xml);
  assert.equal(codec.serialize(reread.document), xml);
  assert.deepEqual(reread.warnings, []);
  assert.equal(reread.document.find('g1').attributes().transform, 'translate(2,3)');
});

test('SVG rejects malformed structure, duplicate ids, unsupported types and invalid geometry', () => {
  const codec = new SvgCodec();
  for (const xml of [
    '<svg><g></svg>', '<svg><g id="a"/><rect id="a"/></svg>', '<svg><box id="a"/></svg>',
    '<svg><rect width="-1"/></svg>', '<svg><text><g/></text></svg>', '<html/>',
  ]) assert.throws(() => codec.parse(xml));
});

test('file IO writes usable XML and leaves the destination intact on failure', () => {
  const directory = mkdtempSync(join(tmpdir(), 'svg-editor-'));
  try {
    const store = new SvgFileStore(); const codec = new SvgCodec();
    const source = join(directory, 'source.svg'); const target = join(directory, 'target.svg');
    writeFileSync(source, '<svg width="200" height="100"><circle id="c" r="5"/></svg>');
    const result = store.read(source); store.save(target, result.document);
    assert.equal(store.read(target).document.find('c').attributes().r, '5');
    assert.equal(readFileSync(target, 'utf8'), codec.serialize(result.document));
    assert.throws(() => store.save(join(directory, 'missing', 'x.svg'), result.document), /cannot write file/);
    assert.throws(() => store.read(join(directory, 'missing.svg')), /cannot read file/);
    assert.deepEqual(readdirSync(directory).sort(), ['source.svg','target.svg']);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
