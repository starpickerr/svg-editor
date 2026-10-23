import test from 'node:test';
import assert from 'node:assert/strict';
import { SvgDocument } from '../src/model/SvgDocument.js';
import { ShapeFactory } from '../src/model/ShapeFactory.js';

test('group preserves tree order, ungroup restores its slot and z-order stays local', () => {
  const doc = new SvgDocument(); const factory = new ShapeFactory();
  const scene = factory.create('g', 'scene', []).asContainer(); doc.add(scene);
  for (const id of ['a', 'b', 'c', 'd']) doc.add(factory.create('rect', id, ['0','0','10','10']), scene);
  const group = doc.group('pair', ['c', 'a']);
  assert.deepEqual(scene.children.map(shape => shape.id), ['pair', 'b', 'd']);
  assert.deepEqual(group.children.map(shape => shape.id), ['a', 'c']);
  doc.ungroup('pair');
  assert.deepEqual(scene.children.map(shape => shape.id), ['a', 'c', 'b', 'd']);
  doc.reorder('a', true);
  assert.deepEqual(scene.children.map(shape => shape.id), ['c', 'b', 'd', 'a']);
  doc.reorder('a', false);
  assert.deepEqual(scene.children.map(shape => shape.id), ['a', 'c', 'b', 'd']);
});

test('cross-parent grouping uses nearest common ancestor and original preorder', () => {
  const doc = new SvgDocument(); const factory = new ShapeFactory();
  for (const id of ['scene', 'left', 'right']) {
    doc.add(factory.create('g', id, []), id === 'scene' ? doc.root : doc.container('scene'));
  }
  doc.add(factory.create('circle', 'a', ['1','2','3']), doc.container('left'));
  doc.add(factory.create('circle', 'b', ['4','5','6']), doc.container('right'));
  doc.group('pair', ['b', 'a']);
  assert.equal(doc.parentOf(doc.find('pair')).id, 'scene');
  assert.deepEqual(doc.find('pair').children.map(shape => shape.id), ['a', 'b']);
  assert.deepEqual(doc.container('scene').children.map(shape => shape.id), ['pair', 'left', 'right']);
  doc.addTo('right', 'a');
  assert.equal(doc.parentOf(doc.find('a')).id, 'right');
});

test('tree operations reject cycles, missing nodes and top-level ungroup before mutation', () => {
  const doc = new SvgDocument(); const factory = new ShapeFactory();
  doc.add(factory.create('g', 'scene', []));
  doc.add(factory.create('g', 'nested', []), doc.container('scene'));
  const before = doc.shapes.map(shape => [shape.id, shape.children.map(child => child.id)]);
  assert.throws(() => doc.group('bad', ['nested', 'scene']), /own descendant: scene/);
  assert.throws(() => doc.addTo('nested', 'scene'), /own descendant: scene/);
  assert.throws(() => doc.group('bad', ['nested', 'missing']), /no such shape: missing/);
  assert.throws(() => doc.ungroup('scene'), /cannot ungroup top-level container: scene/);
  assert.deepEqual(doc.shapes.map(shape => [shape.id, shape.children.map(child => child.id)]), before);
  doc.delete('nested');
  assert.equal(doc.shapes.length, 1);
});
