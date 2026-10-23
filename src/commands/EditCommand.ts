import { SvgDocument } from '../model/SvgDocument.js';

export abstract class EditCommand {
  private before?: SvgDocument;
  private after?: SvgDocument;
  private feedback = '';
  get summary(): string { return this.feedback; }
  protected abstract apply(document: SvgDocument): string;

  execute(document: SvgDocument): SvgDocument {
    const draft = document.clone();
    const feedback = this.apply(draft);
    this.before = document.clone();
    this.after = draft.clone();
    this.feedback = feedback;
    return draft;
  }

  undo(): SvgDocument {
    if (!this.before) throw new Error('command has not executed');
    return this.before.clone();
  }

  redo(): SvgDocument {
    if (!this.after) throw new Error('command has not executed');
    return this.after.clone();
  }
}
