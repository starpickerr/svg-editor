import { Values } from '../model/Values.js';

export class Arguments {
  constructor(private readonly values: readonly string[]) {}
  get length(): number { return this.values.length; }
  expect(min: number, max = min): void { Values.arity(this.values, min, max); }
  string(index: number): string {
    const value = this.values[index];
    if (value === undefined) throw new Error('invalid arguments');
    return value;
  }
  number(index: number, fallback?: number): number {
    if (this.values[index] === undefined && fallback !== undefined) return fallback;
    return Values.number(this.string(index));
  }
  rest(index: number): string[] { return this.values.slice(index); }
}
