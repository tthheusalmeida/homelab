// Regras de mensagem de commit (docs/versionamento.md): Conventional Commits, descrição em inglês,
// primeira linha com até 72 caracteres. Escopo opcional.
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'perf', 'refactor', 'style', 'docs', 'test', 'build', 'ci', 'chore', 'revert'],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 72],
    // Corpo e rodapé são livres (links, Co-Authored-By e listas longas).
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
};
