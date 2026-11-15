import type { MigrationPlan } from './legacy-migration';
import { choiceFromButton, describeMigration, MIGRATION_CHOICES } from './migration-prompt';

const plan: MigrationPlan = {
  libraryDir: 'D:\\homelab\\lib',
  inboxDir: 'D:\\homelab\\temp\\docs',
  hasUsage: true,
  newLibraryDir: 'C:\\Docs\\HomeLab\\library',
  newRootDir: 'C:\\Docs\\HomeLab',
};

describe('describeMigration', () => {
  it('when everything exists, should list the library, the inbox and the usage history and name the new folder', () => {
    const { detail } = describeMigration(plan);

    expect(detail).toContain('Biblioteca (páginas e livros): D:\\homelab\\lib');
    expect(detail).toContain('Entrada: D:\\homelab\\temp\\docs');
    expect(detail).toContain('Histórico de consumo de IA');
    expect(detail).toContain('C:\\Docs\\HomeLab');
  });

  it('when only some data exists, should list only that', () => {
    const { detail } = describeMigration({ ...plan, libraryDir: null, hasUsage: false });

    expect(detail).not.toContain('Biblioteca');
    expect(detail).not.toContain('Histórico');
    expect(detail).toContain('Entrada');
  });

  it('when describing, should promise that nothing is deleted and explain "later"', () => {
    const { detail } = describeMigration(plan);

    expect(detail).toContain('Nada é apagado');
    expect(detail).toContain('pergunta de novo na próxima abertura');
  });

  it('when building the buttons, should follow the order of the choices', () => {
    const { buttons } = describeMigration(plan);

    expect(buttons).toEqual([
      'Mover tudo para a nova pasta',
      'Manter a biblioteca onde está',
      'Agora não',
    ]);
    expect(MIGRATION_CHOICES).toEqual(['move', 'keep', 'later']);
  });
});

describe('choiceFromButton', () => {
  it('when a button is clicked, should answer the matching choice', () => {
    expect(choiceFromButton(0)).toBe('move');
    expect(choiceFromButton(1)).toBe('keep');
    expect(choiceFromButton(2)).toBe('later');
  });

  it('when the dialog is closed without a valid button, should answer "later"', () => {
    expect(choiceFromButton(-1)).toBe('later');
    expect(choiceFromButton(9)).toBe('later');
  });
});
