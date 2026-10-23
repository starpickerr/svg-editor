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

  group(id: string, ids: readonly string[]): Group {
    Values.id(id);
    if (this.shapes.some(shape => shape.id === id)) throw new Error(`id already exists: ${id}`);
    if (ids.length < 2) throw new Error('group requires at least two shapes');
    if (new Set(ids).size !== ids.length) throw new Error('duplicate group member');
    const requested = ids.map(member => this.find(member));
    for (const shape of requested) {
      if (requested.some(other => other !== shape && shape.contains(other))) {
        throw new Error(`cannot group a container into its own descendant: ${shape.id}`);
      }
    }
    const selected = this.shapes.filter(shape => requested.includes(shape));
    let parent = this.parentOf(selected[0]!);
    while (!selected.every(shape => parent.contains(shape))) parent = this.parentOf(parent);
    const index = parent.children.findIndex(child => selected.some(shape => child.contains(shape)));
    const group = new Group(id);
    for (const shape of selected) this.parentOf(shape).remove(shape);
    for (const shape of selected) group.insert(shape);
    parent.insert(group, index);
    return group;
  }

  ungroup(id: string): void {
    const group = this.find(id).asContainer();
    const parent = this.parentOf(group);
    if (parent === this.root) throw new Error(`cannot ungroup top-level container: ${id}`);
    let index = parent.remove(group);
    for (const child of group.children) {
      group.remove(child); parent.insert(child, index++);
    }
  }

  addTo(groupId: string, id: string): void {
    const target = this.container(groupId);
    const shape = this.find(id);
    if (shape.contains(target)) {
      throw new Error(`cannot group a container into its own descendant: ${id}`);
    }
    this.parentOf(shape).remove(shape);
    target.insert(shape);
  }

  reorder(id: string, front: boolean): void {
    const shape = this.find(id);
    const parent = this.parentOf(shape);
    parent.remove(shape);
    parent.insert(shape, front ? parent.children.length : 0);
  }

  clone(): SvgDocument {
    const copy = new SvgDocument(this.width, this.height, this.metadata);
    copy.rootNode = this.root.clone();
    return copy;
  }
}
