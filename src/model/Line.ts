import { GeometryShape } from './GeometryShape.js';

export class Line extends GeometryShape {
  readonly tag = 'line';
  constructor(id: string) { super(id, ['x1', 'y1', 'x2', 'y2'], ['x1', 'x2'], ['y1', 'y2'], [], 'stroke'); }
  protected override geometrySummary(): string {
    const a = this.attributes(); return `(${a.x1},${a.y1}) -> (${a.x2},${a.y2})`;
  }
  override clone(): Line { const copy = new Line(this.id); this.copyGeometry(copy); return copy; }
}
