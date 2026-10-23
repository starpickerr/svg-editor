import { GeometryShape } from './GeometryShape.js';
import { Values } from './Values.js';

export class Text extends GeometryShape {
  readonly tag = 'text';
  private content = '';
  constructor(id: string) { super(id, ['x', 'y'], ['x'], ['y'], []); }
  override get text(): string { return this.content; }
  override get parameterSyntax(): string { return `${super.parameterSyntax} "content"`; }

  override initialize(args: readonly string[]): void {
    Values.arity(args, 3);
    super.initialize(args.slice(0, 2));
    this.content = args[2]!;
  }

  protected override setSpecificAttribute(name: string, value: string): void {
    if (name === 'text') this.content = value;
    else super.setSpecificAttribute(name, value);
  }

  override importText(value: string): void { this.content = value; }
  override summary(): string { return `${super.summary()} ${JSON.stringify(this.content)}`; }
  protected override geometrySummary(): string {
    const attributes = this.attributes(); return `(${attributes.x},${attributes.y})`;
  }
  override clone(): Text {
    const copy = new Text(this.id); this.copyGeometry(copy); copy.content = this.content; return copy;
  }
}
