# Exemplos para testar realimentação e memória com portas comuns

Importe os arquivos JSON pelo botão **Abrir** do OpenCircuit.

## 01_sr_latch_nor.json
Latch SR com duas portas NOR, entradas ativas em nível alto.

Teste esperado:

1. `S=1`, `R=0` → `Q=1`.
2. Volte `S=0`, `R=0` → `Q` deve continuar `1`.
3. `S=0`, `R=1` → `Q=0`.
4. Volte `S=0`, `R=0` → `Q` deve continuar `0`.
5. `S=1`, `R=1` é estado proibido.

## 02_sr_latch_nand_active_low.json
Latch SR com duas portas NAND, entradas ativas em nível baixo.

Repouso: `S̅=1`, `R̅=1`.

Teste esperado:

1. Coloque `S̅=0` → seta `Q=1`.
2. Volte `S̅=1` → mantém.
3. Coloque `R̅=0` → reseta `Q=0`.
4. Volte `R̅=1` → mantém.
5. `S̅=0`, `R̅=0` é estado proibido.

## 03_gated_d_latch_from_nand.json
Latch D com enable, construído com NOT + NANDs.

Teste esperado:

1. `EN=1`, mude `D`: `Q` deve acompanhar `D`.
2. `EN=0`: `Q` deve manter o último valor.
3. Mude `D` enquanto `EN=0`: `Q` não deve mudar.
4. Volte `EN=1`: `Q` volta a acompanhar `D`.

## 04_unstable_not_feedback.json
Teste negativo: NOT ligada nela mesma.

Esperado: o painel deve indicar realimentação e/ou instabilidade, pois o circuito ideal não tem estado estável.
