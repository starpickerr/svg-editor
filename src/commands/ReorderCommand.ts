import { SvgDocument } from '../model/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class ReorderCommand extends EditCommand {
  constructor(private readonly id: string, private readonly front: boolean) { super(); }
  protected override apply(document: SvgDocument): string {
    const shape = document.find(this.id); document.reorder(this.id, this.front);
    return `${shape.label} moved to ${this.front ? 'front' : 'back'}`;
  }
}
