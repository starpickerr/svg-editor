import { GeometryShape } from './GeometryShape.js';

export class Ellipse extends GeometryShape {
  readonly tag = 'ellipse';
  constructor(id: string) { super(id, ['cx', 'cy', 'rx', 'ry'], ['cx'], ['cy'], ['rx', 'ry'], 'fill'); }
  override clone(): Ellipse { const copy = new Ellipse(this.id); this.copyGeometry(copy); return copy; }
}
