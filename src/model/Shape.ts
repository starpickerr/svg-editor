import { Values } from './Values.js';
import type { Group } from './Group.js';

export abstract class Shape {
  private readonly identifier: string;
  private readonly styles = new Map<string, string>();
  private readonly extraAttributes = new Map<string, string>();
  abstract readonly tag: string;

  constructor(id: string) { this.identifier = Values.id(id); }
  get id(): string { return this.identifier; }
  get label(): string { return `${this.tag}#${this.id}`; }
  get children(): readonly Shape[] { return []; }
  get text(): string | undefined { return undefined; }
  abstract get parameterSyntax(): string;

  abstract initialize(args: readonly string[]): void;
  abstract move(dx: number, dy: number): void;
  abstract scale(factor: number): void;
  abstract clone(): Shape;

  setAttribute(name: string, value: string): void {
    if (['fill', 'stroke', 'stroke-width'].includes(name)) {
      if (name === 'stroke-width' && Values.number(value, name) < 0) {
        throw new Error('stroke-width must be non-negative');
      }
      this.styles.set(name, value);
      return;
    }
    this.setSpecificAttribute(name, value);
  }

  protected setSpecificAttribute(name: string, _value: string): void {
    throw new Error(`unknown attribute: ${name}`);
  }

  importAttribute(name: string, value: string): void {
    if (name === 'id') return;
    try { this.setAttribute(name, value); }
    catch (error) {
      if (!(error instanceof Error) || error.message !== `unknown attribute: ${name}`) throw error;
      this.extraAttributes.set(name, value);
    }
  }

  importText(value: string): void {
    if (value.trim()) throw new Error(`unexpected text in <${this.tag}>`);
  }

  attributes(): Record<string, string> {
    return { id: this.id, ...Object.fromEntries(this.extraAttributes), ...Object.fromEntries(this.styles) };
  }

  summary(): string {
    const attributes = Object.entries(this.attributes()).filter(([key]) => key !== 'id');
    return `${this.label}${attributes.length ? '  ' : ''}${attributes.map(([k, v]) => `${k}=${v}`).join(' ')}`;
  }

  asContainer(): Group { throw new Error(`not a container: ${this.id}`); }

  contains(shape: Shape): boolean {
    return this === shape || this.children.some(child => child.contains(shape));
  }

  flatten(): Shape[] { return [this, ...this.children.flatMap(child => child.flatten())]; }

  protected copyCommon(target: Shape): void {
    for (const [name, value] of this.styles) target.styles.set(name, value);
    for (const [name, value] of this.extraAttributes) target.extraAttributes.set(name, value);
  }
}
