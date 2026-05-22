# OpenCircuit

OpenCircuit agora tem duas frentes:

1. **OpenCircuit Logic** — editor visual web para circuitos lógicos, estilo Logisim.

## OpenCircuit Logic

Editor visual moderno/skeumórfico para testar lógica digital.

### MVP atual

- Canvas SVG com grade
- Toolbar de componentes
- Inserção por clique ou drag-and-drop
- Movimento de componentes
- Conexão de fios clicando em saída → entrada
- Simulação automática
- Componentes:
  - Input/Switch
  - LED/Output
  - AND
  - OR
  - NOT
- Autosave em `localStorage`
- Importar/exportar JSON

### Rodar o editor

```bash
npm install
npm run dev
```

Build de produção:

```bash
npm run build
```

Dica: dê duplo clique em um fio para removê-lo.

## Simulador DC Python

Simulador inicial de circuitos DC lineares, sem dependências externas.

### Suporte atual

- Resistores (`resistor`)
- Fontes de tensão DC (`voltage_source`)
- Terra/GND: `gnd`, `ground` ou `0`
- Solução por Análise Nodal Modificada (MNA)
- Saída com tensões dos nós e correntes nas fontes de tensão

Convenção: a corrente de uma fonte de tensão é positiva quando entra no primeiro nó listado, o terminal positivo. Se a fonte está alimentando o circuito, normalmente a corrente aparece negativa.

### Uso

```bash
python -m opencircuit.cli examples/divider.json
```

### Testes Python

```bash
python -m unittest discover -s tests
```
