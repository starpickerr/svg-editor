import { CommandRouter } from './CommandRouter.js';
import { Tokenizer } from './Tokenizer.js';

export class CliSession {
  private readonly tokenizer = new Tokenizer();
  private readonly router = new CommandRouter();

  execute(line: string): string[] {
    try {
      const tokens = this.tokenizer.tokenize(line);
      if (!tokens.length) return [];
      return this.router.execute(tokens[0]!, tokens.slice(1));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return [`error: ${message.replace(/[\r\n]+/g, ' ')}`];
    }
  }
}
