import { SvgDocument } from '../model/SvgDocument.js';
import { Shape } from '../model/Shape.js';

export class TextRenderer {
  tree(document: SvgDocument, id?: string): string {
    if (id !== undefined) {
      const shape = document.find(id);
      return [shape.summary(), ...this.children(shape.children, '')].join('\n');
    }
    return [`svg (${document.width}x${document.height})`, ...this.children(document.root.children, '')].join('\n');
  }

  show(document: SvgDocument, id: string): string {
    const shape = document.find(id); const parent = document.parentOf(shape);
    const attrs = Object.entries(shape.attributes()).filter(([name]) => name !== 'id');
    return [`${shape.label}  parent=${parent === document.root ? 'svg' : parent.label}`,
      ...attrs.map(([name, value]) => `  ${name}=${value}`),
      ...(shape.text === undefined ? [] : [`  text=${JSON.stringify(shape.text)}`])].join('\n');
  }

  private children(shapes: readonly Shape[], prefix: string): string[] {
    return shapes.flatMap((shape, index) => {
      const last = index === shapes.length - 1;
      return [`${prefix}${last ? '└── ' : '├── '}${shape.summary()}`,
        ...this.children(shape.children, `${prefix}${last ? '    ' : '│   '}`)];
    });
  }
}
