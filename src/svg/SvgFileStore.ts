import { accessSync, constants, existsSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { SvgDocument } from '../model/SvgDocument.js';
import { SvgCodec } from './SvgCodec.js';
import type { SvgReadResult } from './SvgCodec.js';

export class SvgFileStore {
  private readonly codec = new SvgCodec();

  read(path: string): SvgReadResult {
    try { return this.codec.parse(readFileSync(path, 'utf8')); }
    catch { throw new Error(`cannot read file: ${path}`); }
  }

  save(path: string, document: SvgDocument): void {
    let temporary: string | undefined;
    try {
      const xml = this.codec.serialize(document);
      if (existsSync(path)) accessSync(path, constants.W_OK);
      temporary = mkdtempSync(join(dirname(path), '.svg-editor-'));
      const output = join(temporary, 'document.svg');
      writeFileSync(output, xml, { encoding: 'utf8', flag: 'wx' });
      renameSync(output, path);
    } catch { throw new Error(`cannot write file: ${path}`); }
    finally {
      if (temporary) {
        // Cleanup cannot turn an already committed rename into a reported save failure.
        try { rmSync(temporary, { recursive: true, force: true }); } catch { /* best-effort cleanup */ }
      }
    }
  }
}
