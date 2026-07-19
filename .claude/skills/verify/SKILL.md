---
name: verify
description: Como buildar, rodar e dirigir o OpenCircuit para verificar mudanças de runtime (UI do editor de circuitos).
---

# Verificação do OpenCircuit

App Vite + React (SPA, sem backend). Superfície: o editor no browser.

## Build e execução

- `npm run build` — typecheck + build de produção em `dist/`.
- `npx vite preview --port 4173` — serve o build de produção.
- `npx vite --port 5173` — dev server. **Necessário para o React Profiler**
  (`<Profiler>` é no-op em build de produção).
- Atenção: porta ocupada faz o Vite incrementar silenciosamente
  (5173→5174…). Sempre confirme qual versão a porta serve, ex.:
  `curl -s localhost:PORT/src/ui/editor/WireView.tsx | grep <símbolo-novo>`.

## Automação (Playwright)

`npm i -D playwright && npx playwright install chromium` (reverter
package.json/package-lock antes de commitar). Scripts ESM fora do repo
precisam de symlink do `node_modules` ao lado do script.

Ganchos úteis da UI:

- Importar circuito: `page.setInputFiles('input[type="file"]', caminho.json)`
  (input escondido; o botão "Abrir" só o clica).
- Clock automático: botão "Rodar clock"/"Pausar clock"; intervalo via
  `page.selectOption('select:has(option[value="100"])', '100')` (100 = 10 Hz).
- Tick manual: botão "Tick".
- Estado visível: `path.wire.on` (fios ativos), `g.component`,
  `image.input-asset` (clicável, alterna input), `image.led-asset`.
  A *soma* de fios ativos pode ser invariante num tick (CLK e ¬CLK alternam);
  compare a assinatura de quais fios estão ativos, não a contagem.

## Profiling em página

Com `?profile=1`, a página expõe `window.__openCircuitProfile`
(`samples`, `summary()`, `reset()`), alimentado pelo `<Profiler
id="CircuitCanvas">` (`react.CircuitCanvas`: actualDuration por commit,
baseDuration em details) e por `measureProfile` (ex.: `routing.orthogonal`).
Só funciona no dev server.

## Circuito de stress

Não há exemplo embutido grande com clock. Gere um: tile de
`examples/sequential-feedback/03_gated_d_latch_from_nand.json` (10 comps
por cópia) + um subcircuito `clock → not → led` (pins: clock sai em `CLK`,
not usa `in`/`out`, led recebe em `in`). ~14 cópias ≈ 143 componentes/156
fios, escala da RAM 4x4 da issue #9.

## Harness SSR

`npm run profile` — benchmark de simulação/roteamento/render via
renderToStaticMarkup (não exercita memo/interação; bom como smoke e para
custo de roteamento).
