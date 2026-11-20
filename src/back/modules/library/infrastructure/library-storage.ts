import { Injectable } from '@nestjs/common';

import * as fs from 'node:fs';
import * as path from 'node:path';

import { BackConfig } from '../../../config/back-config';

import { parseDocument, serializeDocument } from '../domain/frontmatter';
import {
  DocumentStatusOptions,
  MAX_CATEGORY_DEPTH,
  type DocumentMeta,
} from '../domain/library.types';
import { buildFileName, normalizeKey, parseFileName, sanitizeCategoryPath } from '../domain/naming';

export interface StoredDocument {
  /** Caminho completo do arquivo. */
  path: string;
  fileName: string;
  meta: DocumentMeta;
  body: string;
}

/**
 * Leitura e escrita dos arquivos Markdown. Os arquivos são a fonte da
 * verdade: documentos pendentes ficam em `TEMP_DOCS_DIR` (entrada) e os
 * publicados/arquivados em `LIB_DIR`, dentro das pastas da categoria.
 */
@Injectable()
export class LibraryStorage {
  readonly libDir: string;
  readonly inboxDir: string;

  constructor(config: BackConfig) {
    this.libDir = path.resolve(config.libraryDir);
    this.inboxDir = path.resolve(config.inboxDir);
  }

  /** Lista, recursivamente, os arquivos `.md` de uma pasta. */
  async listMarkdownFiles(root: string): Promise<string[]> {
    const result: string[] = [];

    const walk = async (dir: string): Promise<void> => {
      let entries: fs.Dirent[];

      try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
      } catch (error) {
        if (isNotFound(error)) {
          return;
        }

        throw error;
      }

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile() && /\.md$/i.test(entry.name)) {
          result.push(fullPath);
        }
      }
    };

    await walk(root);

    return result.sort();
  }

  /**
   * A pasta em `LIB_DIR` manda na categoria: quem move o arquivo de pasta muda
   * a categoria sem editar o frontmatter. Vale só para publicado/arquivado, com
   * 1 a 4 níveis de pasta válidos; fora disso mantém a categoria do arquivo.
   */
  private categoryFromLocation(filePath: string, meta: DocumentMeta): string[] {
    if (meta.status === DocumentStatusOptions.PENDING) {
      return meta.category;
    }

    const relative = path.relative(this.libDir, path.dirname(filePath));

    if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
      return meta.category;
    }

    const folders = relative.split(path.sep);

    if (folders.length > MAX_CATEGORY_DEPTH) {
      return meta.category;
    }

    try {
      return sanitizeCategoryPath(folders);
    } catch {
      return meta.category;
    }
  }

  /** Procura pelo id no nome do arquivo, sem ler o conteúdo. */
  async findById(root: string, id: string): Promise<string | null> {
    const files = await this.listMarkdownFiles(root);

    return files.find((file) => parseFileName(path.basename(file))?.id === id) ?? null;
  }

  /** Lê e valida um documento; o id do nome deve bater com o do frontmatter. */
  async read(filePath: string): Promise<StoredDocument> {
    const fileName = path.basename(filePath);

    try {
      const raw = await fs.promises.readFile(filePath, 'utf8');
      const { meta, body } = parseDocument(raw);

      if (parseFileName(fileName)?.id !== meta.id) {
        throw new Error(`O id do frontmatter (${meta.id}) não bate com o nome do arquivo.`);
      }

      return {
        path: filePath,
        fileName,
        meta: { ...meta, category: this.categoryFromLocation(filePath, meta) },
        body,
      };
    } catch (error) {
      throw new Error(
        `Falha ao ler "${fileName}": ${
          error instanceof Error ? error.message : 'erro desconhecido'
        }`,
        { cause: error },
      );
    }
  }

  /**
   * Grava o documento no lugar certo para o seu status e devolve o caminho.
   * Pendente vai para a entrada; publicado e arquivado vão para a pasta da
   * categoria (1 a 4 níveis), reaproveitando pastas já existentes.
   */
  async save(meta: DocumentMeta, body: string): Promise<string> {
    const dir =
      meta.status === DocumentStatusOptions.PENDING
        ? this.inboxDir
        : await this.resolveCategoryDir(meta.category, true);

    await fs.promises.mkdir(dir, { recursive: true });

    const filePath = path.join(dir, buildFileName(meta.title, meta.id));
    const temporary = `${filePath}.tmp`;

    // Escreve em arquivo temporário e renomeia: nunca deixa .md pela metade.
    await fs.promises.writeFile(temporary, serializeDocument(meta, body), 'utf8');
    await fs.promises.rename(temporary, filePath);

    return filePath;
  }

  /**
   * Alinha o frontmatter com a pasta: se a `category` gravada no arquivo for diferente da que a pasta
   * indica (ou só na caixa ou nos acentos), reescreve o arquivo (temporário e renomeia) com a da
   * pasta, sem mexer em mais nada (nem em `updatedAt`). Só vale para publicado e arquivado; devolve
   * `true` se reescreveu.
   */
  async alignCategory(filePath: string): Promise<boolean> {
    const raw = await fs.promises.readFile(filePath, 'utf8');
    const { meta, body } = parseDocument(raw);
    const located = this.categoryFromLocation(filePath, meta);

    if (
      meta.status === DocumentStatusOptions.PENDING ||
      (located.length === meta.category.length &&
        located.every((name, i) => name === meta.category[i]))
    ) {
      return false;
    }

    const temporary = `${filePath}.tmp`;

    await fs.promises.writeFile(
      temporary,
      serializeDocument({ ...meta, category: located }, body),
      'utf8',
    );
    await fs.promises.rename(temporary, filePath);

    return true;
  }

  /**
   * Apaga o arquivo. Com `prune` (o padrão), remove também as pastas de categoria que ficarem
   * vazias; o `LibraryService` passa `false`, porque a categoria é uma pasta que existe mesmo sem
   * páginas e só some quando o usuário a exclui.
   */
  async remove(filePath: string, prune = true): Promise<void> {
    const resolved = path.resolve(filePath);
    const root = this.rootOf(resolved);

    await fs.promises.unlink(resolved);

    if (prune && root === this.libDir) {
      await this.pruneEmptyDirs(path.dirname(resolved));
    }
  }

  /**
   * Todas as pastas de categoria de `LIB_DIR` (com ou sem páginas), cada uma como o caminho de nomes
   * de cima para baixo. Ignora pastas ocultas, de nome inválido ou além dos 4 níveis.
   */
  async listCategoryDirs(): Promise<string[][]> {
    const found: string[][] = [];

    const walk = async (dir: string, trail: string[]): Promise<void> => {
      let entries: fs.Dirent[];

      try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
      } catch (error) {
        if (isNotFound(error)) {
          return;
        }

        throw error;
      }

      for (const entry of entries) {
        if (
          !entry.isDirectory() ||
          entry.name.startsWith('.') ||
          trail.length >= MAX_CATEGORY_DEPTH
        ) {
          continue;
        }

        try {
          sanitizeCategoryPath([entry.name]);
        } catch {
          continue;
        }

        const next = [...trail, entry.name];

        found.push(next);
        await walk(path.join(dir, entry.name), next);
      }
    };

    await walk(this.libDir, []);

    return found;
  }

  /** A pasta da categoria existe? (Compara sem diferenciar maiúscula, acento e espaços.) */
  async categoryExists(category: string[]): Promise<boolean> {
    let current = this.libDir;

    for (const name of sanitizeCategoryPath(category)) {
      const existing = await this.findChildDir(current, name);

      if (!existing) {
        return false;
      }

      current = path.join(current, existing);
    }

    return true;
  }

  /**
   * Move a pasta de uma categoria, com tudo o que há dentro (páginas e subcategorias, até as vazias),
   * para o caminho novo. Se o caminho novo não existe, a pasta é renomeada de uma vez; se existe, o
   * conteúdo se junta ao que já está lá (pasta com pasta e arquivo com arquivo; um arquivo com o
   * mesmo nome é um erro, nada é sobrescrito). O caminho novo não pode ficar dentro do antigo.
   */
  async moveCategoryDir(source: string[], target: string[]): Promise<void> {
    const from = await this.resolveCategoryDir(source, false);
    const targetPath = sanitizeCategoryPath(target);
    const name = targetPath[targetPath.length - 1];
    const parent =
      targetPath.length > 1
        ? await this.resolveCategoryDir(targetPath.slice(0, -1), true)
        : this.libDir;
    const existing = await this.findChildDir(parent, name);
    const destination = path.join(parent, existing ?? name);

    if (path.resolve(from) === path.resolve(destination)) {
      return;
    }

    if (isWithin(from, destination)) {
      throw new Error('Uma categoria não pode ir para dentro dela mesma.');
    }

    this.assertWithin(this.libDir, destination);

    if (existing) {
      await this.mergeDir(from, destination);
    } else {
      await fs.promises.rename(from, destination);
    }
  }

  /** Junta o conteúdo de `from` em `into` e apaga `from`, sem sobrescrever nenhum arquivo. */
  private async mergeDir(from: string, into: string): Promise<void> {
    for (const entry of await fs.promises.readdir(from, { withFileTypes: true })) {
      const origin = path.join(from, entry.name);

      if (entry.isDirectory()) {
        const existing = await this.findChildDir(into, entry.name);

        if (existing) {
          await this.mergeDir(origin, path.join(into, existing));
        } else {
          await fs.promises.rename(origin, path.join(into, entry.name));
        }
      } else {
        const destination = path.join(into, entry.name);

        if (await exists(destination)) {
          throw new Error(`Já existe um arquivo "${entry.name}" na pasta de destino.`);
        }

        await fs.promises.rename(origin, destination);
      }
    }

    await fs.promises.rmdir(from);
  }

  /**
   * Apaga a pasta de uma categoria e as subpastas, **só se não houver nenhum arquivo** dentro. Devolve
   * `false` (sem apagar nada) se encontrar algum arquivo.
   */
  async removeCategoryDir(category: string[]): Promise<boolean> {
    const dir = await this.resolveCategoryDir(category, false);

    const hasFiles = async (folder: string): Promise<boolean> => {
      for (const entry of await fs.promises.readdir(folder, { withFileTypes: true })) {
        if (!entry.isDirectory() || (await hasFiles(path.join(folder, entry.name)))) {
          return true;
        }
      }

      return false;
    };

    if (await hasFiles(dir)) {
      return false;
    }

    await fs.promises.rm(dir, { recursive: true });

    return true;
  }

  /**
   * Resolve a pasta de uma categoria dentro de `LIB_DIR`. Compara os nomes
   * ignorando maiúsculas e acentos para reaproveitar pastas existentes e
   * evitar categorias duplicadas.
   */
  async resolveCategoryDir(category: string[], create: boolean): Promise<string> {
    let current = this.libDir;

    for (const name of sanitizeCategoryPath(category)) {
      const existing = await this.findChildDir(current, name);

      current = path.join(current, existing ?? name);
    }

    this.assertWithin(this.libDir, current);

    if (create) {
      await fs.promises.mkdir(current, { recursive: true });
    }

    return current;
  }

  /**
   * Troca só a caixa ou os acentos do nome de uma pasta de categoria ("tecnologia" → "Tecnologia"):
   * o nome novo tem a mesma chave do antigo, então `resolveCategoryDir` reaproveitaria a pasta com o
   * nome velho. Aqui a pasta é renomeada de verdade, com tudo o que há dentro. Devolve `false` se a
   * pasta já tem esse nome.
   */
  async renameCategoryFolder(category: string[], newName: string): Promise<boolean> {
    const dir = await this.resolveCategoryDir(category, false);
    const [name] = sanitizeCategoryPath([newName]);

    if (path.basename(dir) === name) {
      return false;
    }

    const target = path.join(path.dirname(dir), name);

    this.assertWithin(this.libDir, target);
    await fs.promises.rename(dir, target);

    return true;
  }

  private async findChildDir(parent: string, name: string): Promise<string | null> {
    try {
      const entries = await fs.promises.readdir(parent, {
        withFileTypes: true,
      });
      const key = normalizeKey(name);

      return (
        entries.find((entry) => entry.isDirectory() && normalizeKey(entry.name) === key)?.name ??
        null
      );
    } catch (error) {
      if (isNotFound(error)) {
        return null;
      }

      throw error;
    }
  }

  private async pruneEmptyDirs(start: string): Promise<void> {
    let current = start;

    while (current !== this.libDir && current.startsWith(this.libDir)) {
      const entries = await fs.promises.readdir(current);

      if (entries.length > 0) {
        return;
      }

      await fs.promises.rmdir(current);
      current = path.dirname(current);
    }
  }

  private rootOf(target: string): string {
    for (const root of [this.libDir, this.inboxDir]) {
      if (isWithin(root, target)) {
        return root;
      }
    }

    throw new Error('Caminho fora das pastas da biblioteca.');
  }

  private assertWithin(root: string, target: string): void {
    if (!isWithin(root, target)) {
      throw new Error('Caminho fora das pastas da biblioteca.');
    }
  }
}

function isWithin(root: string, target: string): boolean {
  const relative = path.relative(root, target);

  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

async function exists(target: string): Promise<boolean> {
  try {
    await fs.promises.access(target);

    return true;
  } catch {
    return false;
  }
}

function isNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}
