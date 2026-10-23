import { DOMImplementation, DOMParser, XMLSerializer } from '@xmldom/xmldom';
import type { Element, Node, Document } from '@xmldom/xmldom';
import { SvgDocument } from '../model/SvgDocument.js';
import { ShapeFactory } from '../model/ShapeFactory.js';
import { Shape } from '../model/Shape.js';
import { Values } from '../model/Values.js';

export interface SvgReadResult { readonly document: SvgDocument; readonly warnings: readonly string[]; }

export class SvgCodec {
  private readonly factory = new ShapeFactory();

  parse(xml: string): SvgReadResult {
    const source = new DOMParser({ onError: (_level, message) => { throw new Error(message); } })
      .parseFromString(xml, 'image/svg+xml');
    const root = source.documentElement;
    if (!root || root.localName !== 'svg' || source.doctype) throw new Error('expected an SVG document');
    this.validateNamespace(root);
    const attributes = this.attributes(root);
    const viewBox = attributes.viewBox?.trim().split(/[\s,]+/).map(value => Values.number(value, 'viewBox'));
    if (viewBox && (viewBox.length !== 4 || viewBox[2]! <= 0 || viewBox[3]! <= 0)) throw new Error('invalid viewBox');
    const width = this.dimension(attributes.width, viewBox?.[2] ?? 800);
    const height = this.dimension(attributes.height, viewBox?.[3] ?? 600);
    const document = new SvgDocument(width, height, attributes);
    const reserved = new Set<string>();
    for (const element of [root, ...this.descendants(root)]) {
      const id = element.getAttribute('id');
      if (id === null) continue;
      Values.id(id);
      if (reserved.has(id)) throw new Error(`id already exists: ${id}`);
      reserved.add(id);
    }
    const warnings: string[] = [];
    const counters = new Map<string, number>();
    if (this.directText(root).trim()) throw new Error('unexpected text in <svg>');
    for (const child of this.elements(root)) document.add(this.readShape(child, reserved, counters, warnings));
    return { document, warnings };
  }

  serialize(document: SvgDocument): string {
    const dom = new DOMImplementation().createDocument('http://www.w3.org/2000/svg', 'svg', null);
    const root = dom.documentElement!;
    this.writeAttributes(root, document.attributes());
    for (const shape of document.root.children) {
      root.appendChild(dom.createTextNode('\n  '));
      root.appendChild(this.writeShape(dom, shape, '  '));
    }
    if (document.root.children.length) root.appendChild(dom.createTextNode('\n'));
    return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(dom)}\n`;
  }

  private readShape(element: Element, reserved: Set<string>, counters: Map<string, number>, warnings: string[]): Shape {
    this.validateNamespace(element);
    const tag = element.localName!;
    let id = element.getAttribute('id');
    if (id === null) {
      let number = counters.get(tag) ?? 0;
      do { id = `${tag}${++number}`; } while (reserved.has(id));
      counters.set(tag, number); reserved.add(id);
      warnings.push(`warning: assigned id ${id} to unnamed <${tag}>`);
    }
    const shape = this.factory.create(tag, id);
    for (const [name, value] of Object.entries(this.attributes(element))) shape.importAttribute(name, value);
    shape.importText(this.directText(element));
    for (const child of this.elements(element)) {
      shape.asContainer().insert(this.readShape(child, reserved, counters, warnings));
    }
    return shape;
  }

  private writeShape(dom: Document, shape: Shape, indent: string): Element {
    const element = dom.createElementNS('http://www.w3.org/2000/svg', shape.tag);
    this.writeAttributes(element, shape.attributes());
    if (shape.text !== undefined) element.appendChild(dom.createTextNode(shape.text));
    for (const child of shape.children) {
      element.appendChild(dom.createTextNode(`\n${indent}  `));
      element.appendChild(this.writeShape(dom, child, `${indent}  `));
    }
    if (shape.children.length) element.appendChild(dom.createTextNode(`\n${indent}`));
    return element;
  }

  private dimension(value: string | undefined, fallback: number): number {
    return value === undefined ? fallback : Values.number(value.trim().replace(/px$/, ''), 'canvas size');
  }

  private validateNamespace(element: Element): void {
    if (element.namespaceURI && element.namespaceURI !== 'http://www.w3.org/2000/svg') throw new Error('unsupported namespace');
  }

  private attributes(element: Element): Record<string, string> {
    return Object.fromEntries(Array.from(element.attributes).map(attribute => [attribute.name, attribute.value]));
  }

  private writeAttributes(element: Element, attributes: Record<string, string>): void {
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  }

  private elements(node: Node): Element[] {
    return Array.from(node.childNodes).filter(child => child.nodeType === 1) as Element[];
  }

  private descendants(element: Element): Element[] {
    return this.elements(element).flatMap(child => [child, ...this.descendants(child)]);
  }

  private directText(node: Node): string {
    return Array.from(node.childNodes).filter(child => child.nodeType === 3 || child.nodeType === 4)
      .map(child => child.nodeValue ?? '').join('');
  }
}
