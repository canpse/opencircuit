# Baseline e orçamento de performance

O benchmark reproduzível do projeto é executado com:

```bash
npm run profile
```

Ele replica a ULA de 4 bits em cinco tamanhos e mede mediana, p95 e máximo de flatten
hierárquico, índice de fios, simulação, roteamento completo, edição local incremental e
renderização nos dois estilos. Os limites abaixo são verificados e impressos pelo próprio comando.

## Orçamento do roteamento

Os orçamentos são de mediana na máquina de referência (Node 24.13.1, Linux x86_64, Intel Core
i7-7500U):

| Componentes | Fios | Rota completa | Movimento local |
| ----------: | ---: | ------------: | --------------: |
|         144 |  260 |         30 ms |           20 ms |
|         288 |  520 |         90 ms |           35 ms |
|         576 | 1040 |        260 ms |           70 ms |

Medição de 27/07/2026 após cache incremental, pré-cálculo dos obstáculos e índice espacial dos
cruzamentos:

| Componentes | Rota completa | Movimento local | Render Bézier | Render ortogonal |
| ----------: | ------------: | --------------: | ------------: | ---------------: |
|         144 |      10,85 ms |         1,08 ms |       3,98 ms |         17,72 ms |
|         288 |      52,71 ms |         2,56 ms |       7,42 ms |         64,80 ms |
|         576 |     196,55 ms |         5,16 ms |      15,02 ms |        238,22 ms |

O baseline anterior levava aproximadamente 689 ms para rotear e 691 ms para renderizar 576
componentes/1.040 fios. A edição incremental agora preserva rotas fora da região afetada; trunks,
corredores e saltos continuam sendo derivados novamente para manter a geometria global consistente.

## Limites formais e recomendados

O formato aceita, por escopo, até 10.000 componentes e 20.000 fios. Esses são limites de
integridade/transporte, não uma promessa de edição ortogonal interativa.

Hierarquia tem um segundo orçamento, aplicado ao resultado expandido antes de alocar o grafo:
profundidade 32, 10.000 componentes, 20.000 fios, 10.000 instâncias, caminho individual de 4.096
caracteres, 2.000.000 de caracteres de IDs/caminhos e 50.000 unidades de trabalho do preflight.
Assim, dividir um projeto em subcircuitos melhora a organização, mas não permite ultrapassar o
limite total por multiplicação de instâncias.

- Até 288 componentes e 520 fios: faixa interativa recomendada para o modo ortogonal.
- Entre essa faixa e 576 componentes/1.040 fios: o modo funciona, mas Bézier é recomendado para
  navegação e edições frequentes.
- Acima disso: use Bézier ou divida o projeto em subcircuitos; o limite formal existe para
  importação, armazenamento e processamento, não para garantir latência de interface.

O modo Bézier é a alternativa de baixa latência porque não executa busca de caminhos, corredores ou
saltos. Uma regressão deve ser investigada quando `npm run profile` exceder um orçamento de mediana
de modo repetível na mesma máquina.

O perfil também monta uma hierarquia sintética com 10.000 componentes expandidos. Os objetivos são
p95 abaixo de 15 ms para o preflight e abaixo de 50 ms para o flatten completo (incluindo a
guarda). Como o flatten ainda começa na main thread antes do envio do circuito plano ao Worker,
esses limites tornam o período bloqueante explicitamente finito; uma medição acima do orçamento
deve motivar a migração do flatten para o Worker.

Medição de 28/07/2026 na máquina de referência: preflight p95 de 11,87 ms e flatten p95 de 24,27
ms para 10.000 componentes expandidos.

## Instrumentação e invalidação

Com `?profile=1`, o perfil do navegador separa `routing.obstacles`, `routing.paths`,
`routing.decorate` e `routing.orthogonal`, além de `hierarchy.flatten`, `simulation.index` e
`simulation.evaluate`.

Os caches dependem da imutabilidade adotada pelo editor. Uma mudança de componente, fio, ordem de
fios ou lista de definições precisa produzir novas referências. O roteador invalida:

- todos os fios quando ordem, definições ou extremos verticais globais mudam;
- fios cujos endpoints ou waypoints mudaram;
- rotas cuja região cruza a posição anterior ou nova de um componente alterado.
