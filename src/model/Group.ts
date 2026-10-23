import { Shape } from './Shape.js';
import { Values } from './Values.js';

export class Group extends Shape {
  readonly tag = 'g';
  private readonly nodes: Shape[] = [];
  override get children(): readonly Shape[] { return [...this.nodes]; }
  override initialize(args: readonly string[]): void { Values.arity(args, 0); }
  override asContainer(): Group { return this; }
  override move(dx: number, dy: number): void {
    Values.finite(dx); Values.finite(dy);
    for (const child of this.nodes) child.move(dx, dy);
  }
  override scale(factor: number): void {
    Values.positive(factor, 'scale factor');
    for (const child of this.nodes) child.scale(factor);
  }

  insert(shape: Shape, index = this.nodes.length): void {
    if (shape.contains(this)) throw new Error(`cannot group a container into its own descendant: ${shape.id}`);
    if (this.nodes.includes(shape)) throw new Error(`shape already in container: ${shape.id}`);
    if (!Number.isInteger(index) || index < 0 || index > this.nodes.length) throw new Error('invalid child index');
    this.nodes.splice(index, 0, shape);
  }

  remove(shape: Shape): number {
    const index = this.nodes.indexOf(shape);
    if (index < 0) throw new Error(`no such child: ${shape.id}`);
    this.nodes.splice(index, 1);
    return index;
  }

  override clone(): Group {
    const copy = new Group(this.id);
    this.copyCommon(copy);
    for (const child of this.nodes) copy.insert(child.clone());
    return copy;
  }
}
