export class Tokenizer {
  tokenize(line: string): string[] {
    if (!line.trim() || line.trimStart().startsWith('#')) return [];
    const tokens: string[] = [];
    let token = ''; let quoted = false; let active = false;
    for (let index = 0; index < line.length; index++) {
      const character = line[index]!;
      if (character === '"') { quoted = !quoted; active = true; }
      else if (quoted && character === '\\' && ['"', '\\'].includes(line[index + 1] ?? '')) {
        token += line[++index]!; active = true;
      } else if (/\s/u.test(character) && !quoted) {
        if (active) tokens.push(token);
        token = ''; active = false;
      } else { token += character; active = true; }
    }
    if (quoted) throw new Error('unterminated double quote');
    if (active) tokens.push(token);
    return tokens;
  }
}
