import { Editor } from '../commands/Editor.js';
import { EditCommand } from '../commands/EditCommand.js';
import { CreateCommand } from '../commands/CreateCommand.js';
import { DeleteCommand } from '../commands/DeleteCommand.js';
import { MoveCommand } from '../commands/MoveCommand.js';
import { ScaleCommand } from '../commands/ScaleCommand.js';
import { SetCommand } from '../commands/SetCommand.js';
import { GroupCommand } from '../commands/GroupCommand.js';
import { UngroupCommand } from '../commands/UngroupCommand.js';
import { AddToCommand } from '../commands/AddToCommand.js';
import { ReorderCommand } from '../commands/ReorderCommand.js';
import { SvgDocument } from '../model/SvgDocument.js';
import { ShapeFactory } from '../model/ShapeFactory.js';
import { SvgFileStore } from '../svg/SvgFileStore.js';
import { Arguments } from './Arguments.js';
import { TextRenderer } from './TextRenderer.js';

interface Handler {
  readonly syntax: string;
  readonly requiresDocument: boolean;
  readonly run: (args: Arguments) => string[];
}

export class CommandRouter {
  private readonly editor = new Editor();
  private readonly factory = new ShapeFactory();
  private readonly files = new SvgFileStore();
  private readonly renderer = new TextRenderer();
  private readPath?: string;
  // Task-permitted command-name dispatch; future registration is a refactoring point.
  private readonly handlers = new Map<string, Handler>();

  constructor() {
    this.register('init', 'init [w] [h]', args => this.init(args), false);
    this.register('read', 'read <file.svg>', args => this.read(args), false);
    this.register('save', 'save [file.svg]', args => this.save(args));
    this.register('canvas', 'canvas [w] [h]', args => this.canvas(args));
    this.register('create', 'create <type> <id> [params…] [in <containerId>]', args => this.create(args));
    this.register('delete', 'delete <id>', args => this.edit(args, 1, a => new DeleteCommand(a.string(0))));
    this.register('move', 'move <id> <dx> <dy>', args => this.edit(args, 3, a => new MoveCommand(a.string(0), a.number(1), a.number(2))));
    this.register('scale', 'scale <id> <factor>', args => this.edit(args, 2, a => new ScaleCommand(a.string(0), a.number(1))));
    this.register('set', 'set <id> <attr> <value>', args => this.edit(args, 3, a => new SetCommand(a.string(0), a.string(1), a.string(2))));
    this.register('group', 'group <newGid> <id1> <id2>…', args => {
      args.expect(3, Infinity); return [this.editor.execute(new GroupCommand(args.string(0), args.rest(1)))];
    });
    this.register('ungroup', 'ungroup <gid>', args => this.edit(args, 1, a => new UngroupCommand(a.string(0))));
    this.register('addto', 'addto <gid> <id>', args => this.edit(args, 2, a => new AddToCommand(a.string(0), a.string(1))));
    this.register('front', 'front <id>', args => this.edit(args, 1, a => new ReorderCommand(a.string(0), true)));
    this.register('back', 'back <id>', args => this.edit(args, 1, a => new ReorderCommand(a.string(0), false)));
    this.register('tree', 'tree [id]', args => {
      args.expect(0, 1); return [this.renderer.tree(this.editor.document, args.length ? args.string(0) : undefined)];
    });
    this.register('show', 'show <id>', args => { args.expect(1); return [this.renderer.show(this.editor.document, args.string(0))]; });
    this.register('help', 'help', args => {
      args.expect(0);
      return [[...this.handlers.values()].map(handler => handler.syntax).concat(['', ...this.factory.syntaxes()]).join('\n')];
    });
    this.register('undo', 'undo', args => { args.expect(0); return [this.editor.undo()]; });
    this.register('redo', 'redo', args => { args.expect(0); return [this.editor.redo()]; });
  }

  execute(name: string, values: readonly string[]): string[] {
    const handler = this.handlers.get(name);
    if (!handler) throw new Error(`unknown command: ${name}`);
    if (handler.requiresDocument) void this.editor.document;
    return handler.run(new Arguments(values));
  }

  private register(name: string, syntax: string, run: Handler['run'], requiresDocument = true): void {
    this.handlers.set(name, { syntax, run, requiresDocument });
  }

  private init(args: Arguments): string[] {
    args.expect(0, 2);
    const document = new SvgDocument(args.number(0, 800), args.number(1, 600));
    this.editor.load(document); this.readPath = undefined;
    return [`canvas ${document.width}x${document.height} created`];
  }

  private read(args: Arguments): string[] {
    args.expect(1);
    const path = args.string(0); const result = this.files.read(path);
    this.editor.load(result.document); this.readPath = path;
    return [...result.warnings, `read ${path} (${result.document.shapes.length} elements)`];
  }

  private save(args: Arguments): string[] {
    args.expect(0, 1);
    const path = args.length ? args.string(0) : this.readPath;
    if (path === undefined) throw new Error('no file path. use \'save <file.svg>\'');
    this.files.save(path, this.editor.document); this.editor.barrier();
    return [`saved to ${path} (${this.editor.document.shapes.length} elements)`];
  }

  private canvas(args: Arguments): string[] {
    args.expect(0, 2);
    const document = this.editor.document;
    if (args.length) {
      const next = document.clone(); next.resize(args.number(0), args.number(1, document.height));
      this.editor.load(next);
    }
    return [`canvas ${this.editor.document.width}x${this.editor.document.height}`];
  }

  private create(args: Arguments): string[] {
    args.expect(2, Infinity);
    const parameters = args.rest(2);
    let containerId: string | undefined;
    if (parameters.length >= 2 && parameters.at(-2) === 'in') {
      containerId = parameters.pop()!; parameters.pop();
    }
    const shape = this.factory.create(args.string(0), args.string(1), parameters);
    return [this.editor.execute(new CreateCommand(shape, containerId))];
  }

  private edit(args: Arguments, count: number, create: (args: Arguments) => EditCommand): string[] {
    args.expect(count); return [this.editor.execute(create(args))];
  }
}
