# Segurança e atualização de dependências

O OpenCircuit distingue dependências usadas no runtime das ferramentas instaladas apenas para
desenvolvimento e CI. Ambas são auditadas porque código de build, lint e testes também é executado
em máquinas de desenvolvimento e runners com acesso ao repositório.

## Gates

- `npm run audit:prod` executa `npm audit --omit=dev --audit-level=high`;
- `npm run audit` verifica a árvore completa com o mesmo limite;
- `npm run check` executa as duas auditorias antes de formatação, lint, testes e build;
- vulnerabilidades altas ou críticas bloqueiam a CI;
- achados baixos ou moderados devem ser avaliados, mas não bloqueiam automaticamente.

Uma exceção temporária para vulnerabilidade alta ou crítica exige issue própria, avaliação de
impacto, mitigação documentada e prazo de remoção. `overrides` só devem ser usados quando a
compatibilidade da versão transitiva tiver sido demonstrada pela documentação do pacote e pela
suíte completa.

## Atualizações

O Dependabot verifica semanalmente:

- pacotes npm declarados em `package.json` e `package-lock.json`;
- versões das actions usadas pelos workflows do GitHub.

Cada atualização deve preservar o lockfile reproduzível e passar por `npm run check`. Mudanças
major são revisadas junto às respectivas notas de migração; dependências sem manutenção ou sem
compatibilidade com a toolchain suportada devem ser substituídas em vez de congeladas
indefinidamente.

O runtime recomendado é Node.js 24. O mínimo técnico é Node.js 22.13, alinhado ao requisito do
ESLint 10; versões abaixo disso não executam toda a toolchain.
