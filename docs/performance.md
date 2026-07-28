# Baseline de performance

O benchmark reproduzível do projeto é executado com:

```bash
npm run profile
```

Ele replica a ULA de 4 bits em cinco tamanhos e mede separadamente flatten hierárquico, criação do
índice de fios, simulação, roteamento e os dois modos de renderização. Os tempos são apresentados
como mediana, p95 e máximo; a mediana é a comparação mais estável para desenvolvimento local.

## Índice de fios — antes e depois

Medição realizada em 27/07/2026, com Node 24.13.1, Linux x86_64 e Intel Core i7-7500U. O baseline
foi executado em um worktree destacado no commit `90e5e2e`, imediatamente antes da mudança, e a
versão nova na mesma máquina. Valores abaixo são medianas em milissegundos:

| Cópias | Componentes | Fios | Antes | Depois | Variação |
| -----: | ----------: | ---: | ----: | -----: | -------: |
|      1 |          36 |   65 |  0,13 |   0,11 |     -15% |
|      2 |          72 |  130 |  0,21 |   0,15 |     -29% |
|      4 |         144 |  260 |  0,44 |   0,32 |     -27% |
|      8 |         288 |  520 |  0,72 |   0,68 |      -6% |
|     16 |         576 | 1040 |  1,38 |   1,37 |      -1% |

O cenário não força as 64 iterações máximas do relaxamento, portanto a melhoria observada é
moderada. O ganho estrutural é eliminar `wires.find` de cada leitura de pino: após a criação linear
do índice, cada consulta passa a ser O(1). O resultado também confirma que circuitos pequenos não
sofrem regressão material.

Na versão nova, a maior carga medida produziu as seguintes medianas:

| Etapa                  | 576 componentes / 1040 fios |
| ---------------------- | --------------------------: |
| Flatten                |                     1,63 ms |
| Construção do índice   |                     0,13 ms |
| Simulação com índice   |                     1,37 ms |
| Roteamento ortogonal   |                   689,26 ms |
| Renderização Bézier    |                    13,72 ms |
| Renderização ortogonal |                   690,88 ms |

O trabalho dominante no main thread continua sendo o roteamento ortogonal. O flatten e a detecção
de feedback agora possuem cache por identidade; o perfil de navegador (`?profile=1`) também registra
`hierarchy.flatten`, `simulation.index`, `simulation.evaluate` e `routing.orthogonal`
separadamente.

## Invariante de invalidação

Os caches são `WeakMap`s indexados pela identidade do documento e, no flatten, também pela identidade
da lista de definições. Uma alteração estrutural precisa produzir um novo documento ou uma nova lista.
Essa é a mesma regra de imutabilidade adotada pelo editor e está documentada em
`docs/architecture.md`.
