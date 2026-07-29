# OpenCircuit

Editor e simulador de circuitos lógicos no navegador. O projeto suporta portas combinacionais,
blocos aritméticos, componentes sequenciais, realimentação, tabela verdade e importação/exportação
de circuitos em JSON.

## Requisitos

- Node.js 24 (o mínimo técnico é 22.12)
- npm 11 ou compatível

## Desenvolvimento

```bash
npm ci
npm run dev
```

O servidor de desenvolvimento também disponibiliza a API em `/api/circuits` e grava os dados em
`data/opencircuit.sqlite`. Cada navegador recebe uma sessão anônima persistente, assinada pelo
servidor e armazenada em cookie `HttpOnly`; o cliente não escolhe mais o identificador do
proprietário. Para contas reais, o servidor também suporta identidade fornecida por um proxy de
autenticação confiável. Consulte [docs/production-security.md](docs/production-security.md) antes de
qualquer implantação pública.

Para executar o build de produção com o servidor Node:

```bash
npm run build
npm start
```

Use `PORT` para trocar a porta, `OPENCIRCUIT_DB` para escolher o arquivo SQLite dos circuitos e
`OPENCIRCUIT_LIBRARY_DB` para escolher o banco da biblioteca. Os dois recursos podem compartilhar
o mesmo arquivo: suas migrations possuem namespaces independentes. O segredo de sessão é persistido
ao lado do banco por padrão; em produção, prefira `OPENCIRCUIT_SESSION_SECRET`. As demais opções
estão documentadas em `.env.example`.

O Vite informa a URL local ao iniciar. Para validar a mesma sequência executada na integração
contínua:

```bash
npm run check
```

Os comandos individuais são:

- `npm run format:check`: confere a formatação sem alterar arquivos;
- `npm run lint`: verifica cliente, backend, scripts e testes com ambientes separados;
- `npm test`: compila e executa os testes automatizados;
- `npm run build`: verifica os tipos e gera a aplicação de produção em `dist`;
- `npm run profile`: mede os principais cenários de simulação.

Use `npm run format` para formatar os arquivos versionados do projeto.

## Persistência e arquivos

O workspace ativo recebe autosave no armazenamento do navegador. Circuitos e componentes também
podem ser persistidos no servidor, com revisão e tratamento de conflitos.

A interoperabilidade com arquivos locais é deliberadamente feita por **Baixar JSON** e
**Importar JSON**. O projeto não mantém vínculos nativos com arquivos via File System Access API
nem handles em IndexedDB: essa implementação não era alcançável pela interface, variava entre
navegadores e duplicava os fluxos de servidor e JSON. Uma eventual volta dessa capacidade deve ser
tratada como uma funcionalidade completa de produto, com UI, fallback e testes ponta a ponta.

## Organização

- `src/core`: modelo do circuito, catálogo de componentes, validação e simulação;
- `src/state`: persistência do circuito e do espaço de trabalho;
- `src/ui`: aplicação React, editor SVG, painéis e hooks de interação;
- `src/examples`: exemplos e lições embutidos na aplicação;
- `tests`: testes automatizados do simulador e das fronteiras de dados;
- `scripts`: execução dos testes e ferramentas de profiling;
- `examples`: documentos JSON usados como casos de circuitos sequenciais.

As dependências entre camadas e o procedimento para adicionar componentes estão descritos em
[docs/architecture.md](docs/architecture.md). O baseline e o procedimento de profiling ficam em
[docs/performance.md](docs/performance.md).

## Formato dos circuitos

O formato atual usa `version: 1`, com listas de `components` e `wires`. Dados vindos de JSON ou do
armazenamento do navegador passam por validação estrutural e referencial antes de entrar na
aplicação. Mudanças incompatíveis no formato devem criar uma nova versão e uma migração explícita.

## Licença

Distribuído sob a GNU General Public License v3. Consulte [LICENSE](LICENSE).
