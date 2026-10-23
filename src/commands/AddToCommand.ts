import { SvgDocument } from '../model/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class AddToCommand extends EditCommand {
  constructor(private readonly groupId: string, private readonly id: string) { super(); }
  protected override apply(document: SvgDocument): string {
    const label = document.find(this.id).label; document.addTo(this.groupId, this.id);
    return `${label} moved into g#${this.groupId}`;
  }
}
