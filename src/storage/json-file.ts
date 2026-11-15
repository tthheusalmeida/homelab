import * as fs from 'node:fs';
import * as path from 'node:path';

export const BACKUP_SUFFIX = '.bak';
export const CORRUPT_SUFFIX = '.corrupt';

/**
 * Arquivo JSON com escrita atômica (grava em temporário e renomeia) e uma cópia `.bak` da última
 * versão boa. Se o arquivo principal estiver ilegível, a leitura usa o `.bak` (e `recovered` fica
 * `true` para quem quiser avisar o usuário).
 */
export class JsonFile<T> {
  private recoveredFromBackup = false;

  constructor(private readonly filePath: string) {}

  /** Caminho do arquivo principal. */
  get path(): string {
    return this.filePath;
  }

  /** `true` se a última leitura precisou usar a cópia `.bak`. */
  get recovered(): boolean {
    return this.recoveredFromBackup;
  }

  exists(): boolean {
    return fs.existsSync(this.filePath);
  }

  /**
   * `null` se o arquivo não existe. Principal ilegível → tenta o `.bak` (e preserva o ilegível em
   * `.corrupt`); se o `.bak` também falhar, lança `SyntaxError`.
   */
  read(): T | null {
    this.recoveredFromBackup = false;

    if (!this.exists()) {
      return null;
    }

    try {
      return this.parse(this.filePath);
    } catch (error) {
      const backup = this.backupPath;

      if (!fs.existsSync(backup)) {
        throw error;
      }

      const data = this.parse(backup);

      this.quarantine();
      fs.copyFileSync(backup, this.filePath);
      this.recoveredFromBackup = true;

      return data;
    }
  }

  write(data: T): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });

    const tempPath = `${this.filePath}.tmp`;

    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');

    if (this.exists() && this.isReadable()) {
      fs.copyFileSync(this.filePath, this.backupPath);
    }

    fs.renameSync(tempPath, this.filePath);
  }

  /** Move um arquivo ilegível para `.corrupt`, preservando o conteúdo para análise. */
  quarantine(): void {
    fs.renameSync(this.filePath, `${this.filePath}${CORRUPT_SUFFIX}`);
  }

  private get backupPath(): string {
    return `${this.filePath}${BACKUP_SUFFIX}`;
  }

  private parse(file: string): T {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  }

  /** Só vira `.bak` o que é JSON válido: um arquivo corrompido nunca substitui a última boa cópia. */
  private isReadable(): boolean {
    try {
      this.parse(this.filePath);

      return true;
    } catch {
      return false;
    }
  }
}
