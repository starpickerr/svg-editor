import { SvgDocument } from '../model/SvgDocument.js';
import { Shape } from '../model/Shape.js';
import { EditCommand } from './EditCommand.js';

export class CreateCommand extends EditCommand {
  constructor(private readonly shape: Shape, private readonly containerId?: string) { super(); }
  protected override apply(document: SvgDocument): string {
    document.add(this.shape.clone(), document.container(this.containerId));
    return `${this.shape.label} created${this.containerId ? ` in g#${this.containerId}` : ''}`;
  }
}
