export class Values {
  static number(value: string, name = 'number'): number {
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) {
      throw new Error(`invalid ${name}: ${value}`);
    }
    return this.finite(Number(value), name);
  }

  static finite(value: number, name = 'number'): number {
    if (!Number.isFinite(value)) throw new Error(`invalid ${name}: ${value}`);
    return Object.is(value, -0) ? 0 : value;
  }

  static positive(value: number, name: string): number {
    this.finite(value, name);
    if (value <= 0) throw new Error(`${name} must be positive`);
    return value;
  }

  static id(value: string): string {
    if (!value || /[\s<>"'&\x00-\x1f]/u.test(value)) throw new Error(`invalid id: ${value}`);
    return value;
  }

  static arity(args: readonly string[], min: number, max = min): void {
    if (args.length < min || args.length > max) throw new Error('invalid arguments');
  }
}
