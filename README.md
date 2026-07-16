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

O Vite informa a URL local ao iniciar. Para validar a mesma sequência executada na integração
contínua:

```bash
npm run check
```

Os comandos individuais são:

- `npm run format:check`: confere a formatação sem alterar arquivos;
- `npm run lint`: executa as regras estáticas sobre `src`;
- `npm test`: compila e executa os testes automatizados;
- `npm run build`: verifica os tipos e gera a aplicação de produção em `dist`;
- `npm run profile`: mede os principais cenários de simulação.

Use `npm run format` para formatar os arquivos versionados do projeto.

## Organização

- `src/core`: modelo do circuito, catálogo de componentes, validação e simulação;
- `src/state`: persistência do circuito e do espaço de trabalho;
- `src/ui`: aplicação React, editor SVG, painéis e hooks de interação;
- `src/examples`: exemplos e lições embutidos na aplicação;
- `tests`: testes automatizados do simulador e das fronteiras de dados;
- `scripts`: execução dos testes e ferramentas de profiling;
- `examples`: documentos JSON usados como casos de circuitos sequenciais.

## Formato dos circuitos

O formato atual usa `version: 1`, com listas de `components` e `wires`. Dados vindos de JSON ou do
armazenamento do navegador passam por validação estrutural e referencial antes de entrar na
aplicação. Mudanças incompatíveis no formato devem criar uma nova versão e uma migração explícita.

## Licença

Distribuído sob a GNU General Public License v3. Consulte [LICENSE](LICENSE).
