import test from 'node:test';
import assert from 'node:assert/strict';
import { ShapeFactory } from '../src/model/ShapeFactory.js';
import { SvgDocument } from '../src/model/SvgDocument.js';

test('six polymorphic shapes preserve geometry, optional styling and text', () => {
  const factory = new ShapeFactory();
  const document = new SvgDocument();
  const group = factory.create('g', 'scene', []).asContainer();
  document.add(group);
  const samples = [
    ['rect', ['1', '2', '3', '4']], ['circle', ['2', '4', '6']],
    ['ellipse', ['2', '4', '6', '8']], ['line', ['1', '2', '3', '4']],
    ['text', ['1', '2', 'hello 世界']],
  ] as const;
  for (const [type, args] of samples) document.add(factory.create(type, type, args), group);
  const before = document.clone();
  group.move(10, -2); group.scale(2);
  assert.equal(document.find('rect').attributes().x, '22');
  assert.equal(document.find('rect').attributes().height, '8');
  assert.equal(document.find('circle').attributes().r, '12');
  assert.equal(document.find('ellipse').attributes().ry, '16');
  assert.equal(document.find('line').attributes().x2, '26');
  assert.equal(document.find('text').text, 'hello 世界');
  assert.equal(document.find('rect').attributes().fill, undefined);
  assert.equal(before.find('rect').attributes().x, '1');
  group.setAttribute('fill', 'red');
  assert.equal(group.attributes().fill, 'red');
  assert.throws(() => group.setAttribute('x', '1'), /unknown attribute: x/);
});

test('document identity and numeric constraints reject invalid state', () => {
  const factory = new ShapeFactory(); const document = new SvgDocument();
  document.add(factory.create('g', 'A', []));
  document.add(factory.create('g', 'a', []));
  assert.throws(() => document.add(factory.create('rect', 'A', ['0','0','1','1'])), /id already exists: A/);
  assert.throws(() => factory.create('box', 'b', []), /unknown shape type: box/);
  assert.throws(() => factory.create('rect', 'r', ['0','0','-1','1']), /non-negative/);
  assert.throws(() => document.root.scale(0), /scale factor must be positive/);
  assert.throws(() => document.resize(2, -1), /canvas height must be positive/);
  assert.deepEqual([document.width, document.height], [800, 600]);
  assert.throws(() => document.container('missing'), /no such container: missing/);
});
