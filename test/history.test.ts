import test from 'node:test';
import assert from 'node:assert/strict';
import { Editor } from '../src/commands/Editor.js';
import { SvgDocument } from '../src/model/SvgDocument.js';
import { ShapeFactory } from '../src/model/ShapeFactory.js';
import { CreateCommand } from '../src/commands/CreateCommand.js';
import { GroupCommand } from '../src/commands/GroupCommand.js';
import { DeleteCommand } from '../src/commands/DeleteCommand.js';
import { MoveCommand } from '../src/commands/MoveCommand.js';
import { ScaleCommand } from '../src/commands/ScaleCommand.js';

test('complex edits undo as one unit and restore parents, order and descendants', () => {
  const editor = new Editor(); const factory = new ShapeFactory(); editor.load(new SvgDocument());
  for (const id of ['a','b','c']) editor.execute(new CreateCommand(factory.create('rect', id, ['1','2','3','4'])));
  editor.execute(new GroupCommand('pair', ['c','a']));
  editor.undo();
  assert.deepEqual(editor.document.root.children.map(shape => shape.id), ['a','b','c']);
  editor.redo();
  assert.deepEqual(editor.document.find('pair').children.map(shape => shape.id), ['a','c']);
  editor.execute(new DeleteCommand('pair'));
  assert.deepEqual(editor.document.shapes.map(shape => shape.id), ['b']);
  editor.undo();
  assert.deepEqual(editor.document.shapes.map(shape => shape.id), ['pair','a','c','b']);
});

test('failed edits preserve the document, redo history and io barrier', () => {
  const editor = new Editor(); const factory = new ShapeFactory(); editor.load(new SvgDocument());
  assert.throws(() => editor.execute(new DeleteCommand('missing')), /no such shape/);
  assert.throws(() => editor.undo(), /undo not allowed after io command/);
  editor.execute(new CreateCommand(factory.create('rect', 'a', ['1','2','3','4'])));
  editor.execute(new MoveCommand('a', 10, 20)); editor.undo();
  assert.throws(() => editor.execute(new ScaleCommand('a', -1)), /scale factor must be positive/);
  assert.equal(editor.document.find('a').attributes().x, '1');
  editor.redo(); assert.equal(editor.document.find('a').attributes().x, '11');
  editor.undo(); editor.execute(new MoveCommand('a', 5, 0));
  assert.throws(() => editor.redo(), /nothing to redo/);
  editor.barrier(); assert.throws(() => editor.redo(), /undo not allowed after io command/);
});

test('a late arithmetic failure in a composite never publishes partial changes', () => {
  const editor = new Editor(); const factory = new ShapeFactory(); const doc = new SvgDocument();
  const group = factory.create('g','g',[]).asContainer(); doc.add(group);
  doc.add(factory.create('circle','small',['1','1','1']),group);
  doc.add(factory.create('circle','large',['1e308','1','1']),group);
  editor.load(doc);
  assert.throws(() => editor.execute(new ScaleCommand('g', 10)), /invalid number/);
  assert.equal(editor.document.find('small').attributes().cx, '1');
  assert.equal(editor.document.find('large').attributes().cx, '1e+308');
  assert.throws(() => editor.undo(), /undo not allowed after io command/);
});
