import { Shape } from './Shape.js';
import { Values } from './Values.js';

export abstract class GeometryShape extends Shape {
  private readonly geometry: Map<string, number>;

  constructor(id: string, fields: readonly string[], private readonly xFields: readonly string[],
    private readonly yFields: readonly string[], private readonly nonNegative: readonly string[],
    private readonly optionalStyle?: string) {
    super(id);
    this.geometry = new Map(fields.map(field => [field, 0]));
  }

  override get parameterSyntax(): string {
    return [...this.geometry.keys()].map(name => `<${name}>`).join(' ') + (this.optionalStyle ? ` [${this.optionalStyle}]` : '');
  }

  override initialize(args: readonly string[]): void {
    const fields = [...this.geometry.keys()];
    Values.arity(args, fields.length, fields.length + (this.optionalStyle ? 1 : 0));
    fields.forEach((name, index) => this.setAttribute(name, args[index]!));
    if (this.optionalStyle && args[fields.length] !== undefined) {
      this.setAttribute(this.optionalStyle, args[fields.length]!);
    }
  }

  protected override setSpecificAttribute(name: string, value: string): void {
    if (!this.geometry.has(name)) return super.setSpecificAttribute(name, value);
    const number = Values.number(value, name);
    if (this.nonNegative.includes(name) && number < 0) throw new Error(`${name} must be non-negative`);
    this.geometry.set(name, number);
  }

  override move(dx: number, dy: number): void {
    Values.finite(dx); Values.finite(dy);
    const next = new Map(this.geometry);
    for (const name of this.xFields) next.set(name, Values.finite(next.get(name)! + dx));
    for (const name of this.yFields) next.set(name, Values.finite(next.get(name)! + dy));
    for (const [name, value] of next) this.geometry.set(name, value);
  }

  override scale(factor: number): void {
    Values.positive(factor, 'scale factor');
    const next = [...this.geometry].map(([name, value]) => [name, Values.finite(value * factor)] as const);
    for (const [name, value] of next) this.geometry.set(name, value);
  }

  override attributes(): Record<string, string> {
    return { ...super.attributes(), ...Object.fromEntries([...this.geometry].map(([k, v]) => [k, String(v)])) };
  }

  override summary(): string {
    const common = Object.entries(super.attributes()).filter(([name]) => name !== 'id')
      .map(([name, value]) => `${name}=${value}`).join(' ');
    return `${this.label}  ${this.geometrySummary()}${common ? ` ${common}` : ''}`;
  }

  protected geometrySummary(): string {
    return [...this.geometry].map(([name, value]) => `${name.replace(/^width$/, 'w').replace(/^height$/, 'h')}=${value}`).join(' ');
  }

  protected copyGeometry(target: GeometryShape): void {
    this.copyCommon(target);
    for (const [name, value] of this.geometry) target.geometry.set(name, value);
  }
}
