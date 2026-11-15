import * as fs from 'node:fs';
import * as path from 'node:path';

/** Arquivo JSON com escrita atômica (grava em temporário e renomeia). */
export class JsonFile<T> {
  constructor(private readonly filePath: string) {}

  exists(): boolean {
    return fs.existsSync(this.filePath);
  }

  /** `null` se o arquivo não existe. JSON inválido lança `SyntaxError`. */
  read(): T | null {
    if (!this.exists()) {
      return null;
    }

    return JSON.parse(fs.readFileSync(this.filePath, 'utf8')) as T;
  }

  write(data: T): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });

    const tempPath = `${this.filePath}.tmp`;

    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, this.filePath);
  }

  /** Move um arquivo ilegível para `.corrupt`, preservando o conteúdo para análise. */
  quarantine(): void {
    fs.renameSync(this.filePath, `${this.filePath}.corrupt`);
  }
}
