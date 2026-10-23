import { SvgDocument } from '../model/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class Editor {
  private current?: SvgDocument;
  private undoStack: EditCommand[] = [];
  private redoStack: EditCommand[] = [];
  private blocked = false;

  get document(): SvgDocument {
    if (!this.current) throw new Error("no document. use 'init' or 'read' first");
    return this.current;
  }

  load(document: SvgDocument): void { this.current = document.clone(); this.barrier(); }

  barrier(): void {
    this.undoStack = []; this.redoStack = []; this.blocked = true;
  }

  execute(command: EditCommand): string {
    const result = command.execute(this.document);
    this.current = result;
    this.undoStack.push(command);
    this.redoStack = [];
    this.blocked = false;
    return command.summary;
  }

  undo(): string {
    this.checkHistory();
    const command = this.undoStack.at(-1);
    if (!command) throw new Error('nothing to undo');
    const result = command.undo();
    this.undoStack.pop(); this.redoStack.push(command); this.current = result;
    return `undone: ${command.summary}`;
  }

  redo(): string {
    this.checkHistory();
    const command = this.redoStack.at(-1);
    if (!command) throw new Error('nothing to redo');
    const result = command.redo();
    this.redoStack.pop(); this.undoStack.push(command); this.current = result;
    return `redone: ${command.summary}`;
  }

  private checkHistory(): void {
    void this.document;
    if (this.blocked) throw new Error('undo not allowed after io command');
  }
}
