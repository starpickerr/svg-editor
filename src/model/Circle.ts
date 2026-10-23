import { GeometryShape } from './GeometryShape.js';

export class Circle extends GeometryShape {
  readonly tag = 'circle';
  constructor(id: string) { super(id, ['cx', 'cy', 'r'], ['cx'], ['cy'], ['r'], 'fill'); }
  override clone(): Circle { const copy = new Circle(this.id); this.copyGeometry(copy); return copy; }
}
