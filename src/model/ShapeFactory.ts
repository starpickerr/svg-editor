import { Shape } from './Shape.js';
import { Rect } from './Rect.js';
import { Circle } from './Circle.js';
import { Ellipse } from './Ellipse.js';
import { Line } from './Line.js';
import { Text } from './Text.js';
import { Group } from './Group.js';

export class ShapeFactory {
  // Task-permitted name dispatch; plugin registration is a later refactoring point.
  private readonly constructors: ReadonlyMap<string, new (id: string) => Shape> = new Map<string, new (id: string) => Shape>([
    ['rect', Rect], ['circle', Circle], ['ellipse', Ellipse], ['line', Line], ['text', Text], ['g', Group],
  ]);

  create(type: string, id: string, args?: readonly string[]): Shape {
    const Constructor = this.constructors.get(type);
    if (!Constructor) throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    const shape = new Constructor(id);
    if (args !== undefined) shape.initialize(args);
    return shape;
  }
}
