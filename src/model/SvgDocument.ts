import { Group } from './Group.js';
import { Shape } from './Shape.js';
import { Values } from './Values.js';

export class SvgDocument {
  private canvasWidth: number;
  private canvasHeight: number;
  private rootNode: Group;
  private readonly metadata: Record<string, string>;

  constructor(width = 800, height = 600, attributes: Record<string, string> = {}) {
    this.canvasWidth = Values.positive(width, 'canvas width');
    this.canvasHeight = Values.positive(height, 'canvas height');
    this.rootNode = new Group('__canvas__');
    this.metadata = { ...attributes };
  }
  get width(): number { return this.canvasWidth; }
  get height(): number { return this.canvasHeight; }
  get root(): Group { return this.rootNode; }
  get shapes(): readonly Shape[] { return this.root.children.flatMap(child => child.flatten()); }

  resize(width: number, height: number): void {
    Values.positive(width, 'canvas width'); Values.positive(height, 'canvas height');
    this.canvasWidth = width; this.canvasHeight = height;
    this.metadata.viewBox = `0 0 ${width} ${height}`;
  }

  attributes(): Record<string, string> {
    return { xmlns: 'http://www.w3.org/2000/svg', viewBox: `0 0 ${this.width} ${this.height}`,
      ...this.metadata, width: String(this.width), height: String(this.height) };
  }

  find(id: string): Shape {
    const shape = this.shapes.find(node => node.id === id);
    if (!shape) throw new Error(`no such shape: ${id}`);
    return shape;
  }

  container(id?: string): Group {
    if (id === undefined) return this.root;
    const shape = this.shapes.find(node => node.id === id);
    if (!shape) throw new Error(`no such container: ${id}`);
    return shape.asContainer();
  }

  parentOf(shape: Shape): Group {
    const parent = [this.root, ...this.shapes].find(node => node.children.includes(shape));
    if (!parent) throw new Error(`detached shape: ${shape.id}`);
    return parent.asContainer();
  }

  add(shape: Shape, parent = this.root, index = parent.children.length): void {
    const existing = new Set(this.shapes.map(node => node.id));
    for (const node of shape.flatten()) {
      if (existing.has(node.id)) throw new Error(`id already exists: ${node.id}`);
      existing.add(node.id);
    }
    if (parent !== this.root && !this.shapes.includes(parent)) throw new Error('detached parent');
    parent.insert(shape, index);
  }

  delete(id: string): Shape {
    const shape = this.find(id); this.parentOf(shape).remove(shape); return shape;
  }

  clone(): SvgDocument {
    const copy = new SvgDocument(this.width, this.height, this.metadata);
    copy.rootNode = this.root.clone();
    return copy;
  }
}
