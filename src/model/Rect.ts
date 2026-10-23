import { GeometryShape } from './GeometryShape.js';

export class Rect extends GeometryShape {
  readonly tag = 'rect';
  constructor(id: string) {
    super(id, ['x', 'y', 'width', 'height'], ['x'], ['y'], ['width', 'height'], 'fill');
  }
  override clone(): Rect { const copy = new Rect(this.id); this.copyGeometry(copy); return copy; }
}
