import { GeometryShape } from './GeometryShape.js';

export class Line extends GeometryShape {
  readonly tag = 'line';
  constructor(id: string) { super(id, ['x1', 'y1', 'x2', 'y2'], ['x1', 'x2'], ['y1', 'y2'], [], 'stroke'); }
  override clone(): Line { const copy = new Line(this.id); this.copyGeometry(copy); return copy; }
}
