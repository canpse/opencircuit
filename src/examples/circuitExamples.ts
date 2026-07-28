import type { CircuitDocument } from '../core/types';
import { RAW_CIRCUIT_EXAMPLES, type RawCircuitExample } from './circuitDocuments';
import { CIRCUIT_EXAMPLE_IDS } from './circuitExampleTypes';
import type {
  CircuitExample,
  CircuitExampleId,
  CircuitExampleMode,
  CircuitLesson,
  ExampleMetadata,
} from './circuitExampleTypes';

export { CURRICULUM_FAMILIES, CURRICULUM_MODULES, CURRICULUM_TRACKS } from './curriculum';
export type {
  CircuitDifficulty,
  CircuitExample,
  CircuitExampleId,
  CircuitExampleMode,
  CircuitLesson,
  CircuitLevel,
  CurriculumFamily,
  CurriculumModule,
  CurriculumTrack,
} from './circuitExampleTypes';

const GENERIC_METADATA_EXAMPLE_IDS = new Set<CircuitExampleId>([
  'd-latch-basic',
  'sr-latch-nor-experiment',
  'sr-latch-nand-active-low',
  'gated-d-latch-from-nand',
  'adder-4-bit',
  'subtractor-4-bit',
  'adder-4-bit-gates',
  'subtractor-4-bit-gates',
  'mux-2-1',
  'decoder-2-4',
  'demux-1-2',
  'odd-parity-3',
  'majority-3',
  'encoder-4-2',
  'mux-4-1',
]);

function metadataFor(example: RawCircuitExample): ExampleMetadata {
  const description = example.description ?? extractExampleDescription(example.circuit);
  const common = {
    description,
    goal: description,
    steps: [
      'Altere as entradas do circuito.',
      'Observe a saída no LED.',
      'Compare com a tabela verdade ou painel de estado.',
    ],
    ideas: [] as string[],
    extensions: [],
    modes: ['demo'] as CircuitExampleMode[],
    observe: [
      'Altere as entradas e observe as saídas no circuito.',
      'Compare o comportamento com a descrição dentro do canvas.',
    ],
    experiments: [
      'Teste todas as combinações de entrada.',
      'Renomeie sinais importantes para reforçar o significado do circuito.',
    ],
    exercises: [],
  };

  if (example.id === 'signal-led-basic') {
    return {
      ...common,
      moduleId: 'fundamentals',
      familyIds: ['truth-table'],
      trackIds: ['boolean'],
      difficulty: 1,
      level: 'concept',
      prerequisites: [],
      concepts: ['sinal binário', 'switch', 'fio', 'LED', 'nível lógico 0/1'],
      goal: 'Entender que um switch gera um sinal 0 ou 1, que fios transportam esse sinal e que o mesmo sinal pode alimentar mais de um destino.',
      steps: [
        'Clique no switch A.',
        'Observe OUT 1 e OUT 2 acenderem juntos.',
        'Clique novamente em A e veja os dois LEDs apagarem juntos.',
        'Veja a linha destacada na tabela verdade mudar junto com o switch.',
      ],
      ideas: [
        'Um sinal digital tem apenas dois valores: 0/desligado ou 1/ligado.',
        'Um fio não cria lógica: ele apenas transporta o valor de um ponto para outro.',
        'Uma saída pode alimentar várias entradas; isso será importante para clock, reset e sinais compartilhados.',
        'Pinos de entrada não conectados são interpretados como 0 neste simulador.',
      ],
      next: ['not-basic', 'and-basic'],
      observe: [
        'OUT 1 e OUT 2 sempre mostram o mesmo valor de A.',
        'A saída A pode alimentar dois LEDs ao mesmo tempo.',
        'Veja a linha atual destacada na tabela verdade.',
      ],
      experiments: [
        'Renomeie A para Entrada e os LEDs para Saída 1 e Saída 2.',
        'Apague um dos fios e reconecte a saída de A ao LED.',
        'Adicione um terceiro LED observando o mesmo sinal.',
      ],
      challenge:
        'Desconecte um dos LEDs e explique por que ele deixa de acompanhar A enquanto o outro continua funcionando.',
      exercises: [
        'Semáforo de aviso: crie um switch chamado Energia e dois LEDs chamados Painel e Sirene. Os dois devem acompanhar Energia ao mesmo tempo.',
        'Sinal compartilhado: crie um switch chamado Sensor e três LEDs chamados A, B e C. Todos devem acender juntos quando Sensor=1.',
        'Teste de fio faltando: monte dois LEDs, mas conecte apenas um deles ao switch. Explique por que só um responde.',
      ],
    };
  }

  if (example.id === 'not-basic') {
    return {
      ...common,
      moduleId: 'fundamentals',
      familyIds: ['gates', 'truth-table'],
      trackIds: ['boolean'],
      difficulty: 1,
      level: 'concept',
      prerequisites: ['signal-led-basic'],
      concepts: ['inversão', 'complemento lógico', 'entrada e saída'],
      goal: 'Entender a ideia de inversão: a saída de uma porta NOT é sempre o contrário da entrada.',
      steps: [
        'Comece com A desligado e observe OUT ligado.',
        'Ligue A e veja OUT apagar.',
        'Alterne A algumas vezes e confira que os dois sinais nunca ficam iguais.',
      ],
      ideas: [
        'NOT transforma 0 em 1 e 1 em 0.',
        'A tabela verdade de uma entrada tem apenas duas linhas.',
        'Inversão é uma das operações mais usadas para construir circuitos maiores.',
      ],
      next: ['and-basic', 'or-basic', 'nand-basic'],
      observe: [
        'Compare A e OUT: eles devem estar sempre opostos.',
        'Use a tabela verdade para confirmar os dois casos possíveis.',
      ],
      experiments: [
        'Ligue A e observe OUT apagar.',
        'Desligue A e observe OUT acender.',
        'Tente prever OUT antes de clicar no switch.',
      ],
      challenge:
        'Monte outro inversor usando uma porta NAND com as duas entradas ligadas ao mesmo sinal.',
      exercises: [
        'Luz de porta aberta: crie uma entrada Porta fechada e um LED Aviso. O aviso deve acender quando a porta NÃO estiver fechada.',
        'Modo silencioso: crie uma entrada Som ligado e uma saída Mudo. Mudo deve ser 1 quando Som ligado for 0.',
        'Sensor invertido: crie uma entrada Escuro e um LED Claro. O LED deve acender quando não estiver escuro.',
      ],
    };
  }

  if (example.id === 'and-basic') {
    return {
      ...common,
      moduleId: 'fundamentals',
      familyIds: ['gates', 'truth-table'],
      trackIds: ['boolean'],
      difficulty: 1,
      level: 'concept',
      prerequisites: ['signal-led-basic'],
      concepts: ['conjunção lógica', 'condição simultânea', 'tabela verdade de 2 entradas'],
      goal: 'Entender que AND representa uma condição simultânea: A e B precisam estar ligados para a saída ligar.',
      steps: [
        'Teste A=0 e B=0.',
        'Ligue apenas A.',
        'Desligue A e ligue apenas B.',
        'Ligue A e B ao mesmo tempo e observe quando OUT acende.',
      ],
      ideas: [
        'AND só produz 1 quando todas as entradas são 1.',
        'Duas entradas geram quatro combinações na tabela verdade.',
        'AND é útil para representar “isto E aquilo”.',
      ],
      next: ['or-basic', 'xor', 'nand-basic'],
      observe: [
        'OUT só acende quando A e B estão ligados ao mesmo tempo.',
        'Compare as quatro combinações da tabela verdade.',
      ],
      experiments: [
        'Teste 00, 01, 10 e 11 em ordem.',
        'Use AND como uma condição: “A e B precisam ser verdadeiros”.',
      ],
      challenge:
        'Explique uma situação real que precise de duas condições simultâneas, como chave de segurança E botão pressionado.',
      exercises: [
        'Cofre de duas chaves: a saída Abrir só deve ligar quando Chave A=1 E Chave B=1.',
        'Máquina segura: a saída Motor só deve ligar quando Proteção fechada=1 E Botão pressionado=1.',
        'Login simples: a saída Acesso só deve ligar quando Senha correta=1 E Cartão presente=1.',
      ],
    };
  }

  if (example.id === 'or-basic') {
    return {
      ...common,
      moduleId: 'fundamentals',
      familyIds: ['gates', 'truth-table'],
      trackIds: ['boolean'],
      difficulty: 1,
      level: 'concept',
      prerequisites: ['signal-led-basic'],
      concepts: ['disjunção lógica', 'condição alternativa', 'tabela verdade de 2 entradas'],
      goal: 'Entender que OR representa uma condição alternativa: A ou B já é suficiente para ligar a saída.',
      steps: [
        'Comece com A=0 e B=0 e veja OUT apagado.',
        'Ligue apenas A.',
        'Desligue A e ligue apenas B.',
        'Ligue A e B juntos e compare com AND.',
      ],
      ideas: [
        'OR produz 1 quando pelo menos uma entrada é 1.',
        'A única linha desligada é quando todas as entradas são 0.',
        'OR é útil para representar “isto OU aquilo”.',
      ],
      next: ['xor', 'nor-basic'],
      observe: ['OUT acende se A ou B estiver ligado.', 'A única forma de OUT apagar é A=0 e B=0.'],
      experiments: [
        'Teste as quatro combinações e diga em voz alta quando a saída deveria ligar.',
        'Compare mentalmente OR com AND.',
      ],
      challenge:
        'Modifique o circuito para que dois switches diferentes possam acender dois LEDs ao mesmo tempo.',
      exercises: [
        'Campainha dupla: a saída Campainha deve ligar se Botão frente=1 OU Botão fundos=1.',
        'Alarme de janela: a saída Alarme deve ligar se Janela A aberta=1 OU Janela B aberta=1.',
        'Pedido de ajuda: a saída Chamar professor deve ligar se Aluno A chamou=1 OU Aluno B chamou=1.',
      ],
    };
  }

  if (example.id === 'xor') {
    return {
      ...common,
      moduleId: 'fundamentals',
      familyIds: ['gates', 'truth-table'],
      trackIds: ['boolean', 'arithmetic'],
      difficulty: 1,
      level: 'concept',
      prerequisites: ['and-basic', 'or-basic', 'not-basic'],
      concepts: ['diferença entre bits', 'paridade simples', 'base da soma binária'],
      goal: 'Entender que XOR detecta diferença: a saída liga quando as duas entradas têm valores diferentes.',
      steps: ['Teste 0 e 0.', 'Teste 1 e 0.', 'Teste 0 e 1.', 'Teste 1 e 1 e compare com OR.'],
      ideas: [
        'XOR liga quando existe exatamente uma entrada ligada.',
        'XOR apaga quando as entradas são iguais.',
        'XOR aparece em somadores porque parece uma soma de bits sem o carry.',
      ],
      next: ['xnor-basic', 'microwave-safety-challenge', 'half-adder'],
      observe: ['OUT acende quando A e B são diferentes.', 'OUT apaga quando A e B são iguais.'],
      experiments: [
        'Compare XOR com OR quando A=B=1.',
        'Tente prever a saída antes de cada clique.',
      ],
      challenge: 'Explique por que XOR parece uma soma de 1 bit sem carry.',
      exercises: [
        'Interruptor paralelo: a lâmpada deve acender quando Interruptor A e Interruptor B estiverem em posições diferentes.',
        'Detector de discordância: a saída Erro deve ligar quando Sensor A e Sensor B forem diferentes.',
        'Voto divergente: a saída Divergência deve ligar quando dois jurados escolherem respostas diferentes.',
      ],
    };
  }

  if (example.id === 'nand-basic') {
    return {
      ...common,
      moduleId: 'fundamentals',
      familyIds: ['gates', 'truth-table'],
      trackIds: ['boolean'],
      difficulty: 1,
      level: 'concept',
      prerequisites: ['and-basic', 'not-basic'],
      concepts: ['porta negada', 'NAND = NOT(AND)', 'porta universal'],
      goal: 'Entender que NAND é uma AND invertida: ela só desliga no caso em que AND ligaria.',
      steps: [
        'Teste as quatro combinações de A e B.',
        'Compare especialmente o caso A=1 e B=1.',
        'Volte ao exemplo AND básico e compare as tabelas.',
      ],
      ideas: [
        'NAND significa NOT AND.',
        'Ela é o contrário exato da AND.',
        'NAND é uma porta universal: com ela é possível construir outras portas.',
      ],
      next: ['nand-not', 'nor-basic'],
      observe: ['Compare com AND: a saída é invertida.', 'OUT só apaga no caso A=1 e B=1.'],
      experiments: [
        'Teste as quatro linhas da tabela verdade.',
        'Compare a linha A=1,B=1 com as outras três.',
      ],
      challenge: 'Explique por que NAND pode ser vista como uma AND seguida de uma inversão.',
      exercises: [
        'Alarme anti-cofre: a saída Bloqueado deve desligar apenas quando Chave A=1 E Chave B=1.',
        'Falha de dupla confirmação: a saída Falha deve ficar ligada exceto quando Operador A e Operador B confirmarem juntos.',
        'Construa uma AND usando uma NAND seguida de uma inversão.',
      ],
    };
  }

  if (example.id === 'nor-basic') {
    return {
      ...common,
      moduleId: 'fundamentals',
      familyIds: ['gates', 'truth-table'],
      trackIds: ['boolean'],
      difficulty: 1,
      level: 'concept',
      prerequisites: ['or-basic', 'not-basic'],
      concepts: ['porta negada', 'NOR = NOT(OR)', 'porta universal'],
      goal: 'Entender que NOR é uma OR invertida: ela só liga quando nenhuma entrada está ligada.',
      steps: [
        'Comece com A=0 e B=0 e observe OUT ligado.',
        'Ligue A ou B e veja OUT apagar.',
        'Compare com o exemplo OR básico.',
      ],
      ideas: [
        'NOR significa NOT OR.',
        'Ela é o contrário exato da OR.',
        'NOR também é uma porta universal e será útil para latches.',
      ],
      next: ['xnor-basic', 'sr-latch-nor-experiment'],
      observe: ['Compare com OR: a saída é invertida.', 'OUT só liga quando A=0 e B=0.'],
      experiments: [
        'Teste A=0,B=0 primeiro.',
        'Depois ligue qualquer entrada e observe OUT desligar.',
      ],
      challenge: 'Explique por que NOR pode ser vista como uma OR seguida de uma inversão.',
      exercises: [
        'Sistema parado: a saída Parado deve ligar apenas quando Pedido A=0 E Pedido B=0.',
        'Sala vazia: a saída Luz apagada deve ligar apenas quando Movimento A=0 E Movimento B=0.',
        'Construa uma OR usando uma NOR seguida de uma inversão.',
      ],
    };
  }

  if (example.id === 'xnor-basic') {
    return {
      ...common,
      moduleId: 'fundamentals',
      familyIds: ['gates', 'truth-table'],
      trackIds: ['boolean'],
      difficulty: 1,
      level: 'concept',
      prerequisites: ['xor'],
      concepts: ['igualdade entre bits', 'XNOR = NOT(XOR)', 'comparação simples'],
      goal: 'Entender que XNOR detecta igualdade: a saída liga quando as duas entradas têm o mesmo valor.',
      steps: [
        'Teste A=0 e B=0.',
        'Teste os dois casos em que A e B são diferentes.',
        'Teste A=1 e B=1.',
        'Compare com o XOR básico.',
      ],
      ideas: [
        'XNOR é o contrário da XOR.',
        'Ela liga para 00 e 11.',
        'XNOR pode ser usada como um pequeno teste de igualdade entre dois bits.',
      ],
      next: ['microwave-safety-challenge', 'comparator-1-bit'],
      observe: ['OUT liga quando A e B são iguais.', 'OUT apaga quando A e B são diferentes.'],
      experiments: ['Compare com o XOR básico.', 'Teste 00 e 11: ambos devem ligar OUT.'],
      challenge: 'Explique por que XNOR pode ser usada como teste de igualdade entre dois bits.',
      exercises: [
        'Senha de 1 bit: a saída Correto deve ligar quando Entrada e Senha salva forem iguais.',
        'Sensores concordam: a saída OK deve ligar quando Sensor A e Sensor B tiverem o mesmo valor.',
        'Comparador simples: crie duas entradas A e B e um LED Igual que acenda para 00 e 11.',
      ],
    };
  }

  if (example.id === 'nand-not') {
    return {
      ...common,
      moduleId: 'fundamentals',
      familyIds: ['gates', 'truth-table'],
      trackIds: ['boolean'],
      difficulty: 1,
      level: 'concept',
      prerequisites: ['nand-basic'],
      concepts: ['porta universal', 'equivalência lógica', 'reutilização de portas'],
      goal: 'Entender que uma mesma porta pode ser reaproveitada de outro jeito: NAND pode funcionar como NOT.',
      steps: [
        'Alterne A e observe OUT.',
        'Compare com o exemplo NOT básico.',
        'Perceba que A está ligado nas duas entradas da NAND.',
      ],
      ideas: [
        'Quando as duas entradas da NAND recebem o mesmo sinal, o resultado é o inverso desse sinal.',
        'Circuitos diferentes podem ter a mesma tabela verdade.',
        'Essa é a primeira ideia de equivalência entre circuitos.',
      ],
      next: ['microwave-safety-challenge', 'sr-latch-nand-active-low'],
      observe: [
        'A alimenta as duas entradas da NAND.',
        'Quando as duas entradas são iguais, NAND se comporta como NOT.',
      ],
      experiments: [
        'Compare este circuito com o NOT básico.',
        'Desconecte uma entrada da NAND e veja por que a equivalência deixa de fazer sentido.',
      ],
      challenge:
        'Pesquise mentalmente: se NAND pode virar NOT, como construir AND usando NAND + NOT?',
      exercises: [
        'Construa NOT usando NAND e compare com a porta NOT nativa usando dois LEDs.',
        'Construa AND usando apenas NANDs: primeiro faça NAND(A,B), depois inverta esse resultado com outra NAND.',
        'Construa um circuito que acenda quando A=0 usando somente NANDs.',
      ],
    };
  }
  if (example.id === 'microwave-safety-challenge') {
    return {
      ...common,
      moduleId: 'fundamentals',
      familyIds: ['gates', 'truth-table'],
      trackIds: ['boolean'],
      difficulty: 1,
      level: 'composition',
      prerequisites: ['and-basic', 'or-basic'],
      concepts: ['condição de segurança', 'composição de portas', 'teste de casos'],
      goal: 'Aplicar portas básicas em uma situação narrativa: o motor do micro-ondas só pode ligar quando todas as condições de segurança forem verdadeiras.',
      steps: [
        'Teste com a porta aberta: o motor deve ficar desligado.',
        'Feche a porta, mas deixe Start desligado.',
        'Ligue Start, mas deixe o timer zerado.',
        'Por fim, ligue Porta fechada, Start e Tempo > 0 ao mesmo tempo.',
      ],
      ideas: [
        'Problemas reais podem virar frases lógicas.',
        '“Só liga se A, B e C forem verdadeiros” é uma composição de ANDs.',
        'A tabela verdade ajuda a testar se nenhuma condição perigosa liga o motor por engano.',
      ],
      next: ['half-adder', 'mux-2-1'],
      observe: [
        'O LED Motor só deve acender quando as três entradas estão ligadas.',
        'Cada AND combina duas condições por vez.',
        'A tabela verdade mostra todos os casos possíveis.',
      ],
      experiments: [
        'Tente encontrar algum caso perigoso em que o motor ligue com a porta aberta.',
        'Renomeie as portas AND para mostrar quais condições elas combinam.',
        'Explique o circuito em voz alta como uma frase: Motor liga se...',
      ],
      challenge:
        'Adicione um LED chamado “Seguro” que acenda quando Porta fechada e Tempo > 0 estiverem verdadeiros, mesmo antes de pressionar Start.',
      exercises: [
        'Alarme de geladeira: crie um circuito em que o alarme ligue se a porta estiver aberta E a luz da cozinha estiver apagada.',
        'Luz automática do corredor: crie um circuito em que a luz acenda se houver movimento OU se o botão manual for pressionado.',
        'Cinto de segurança: crie um circuito em que o aviso ligue se o motorista estiver sentado E o cinto NÃO estiver preso.',
        'Cofre de duas chaves: crie um circuito em que o cofre abra apenas se Chave A E Chave B estiverem ligadas ao mesmo tempo.',
        'Interruptor paralelo: crie um circuito em que a lâmpada acenda quando os interruptores A e B estiverem em posições diferentes.',
        'Indicador de igualdade: crie um circuito em que o painel acenda quando Sensor A e Sensor B tiverem o mesmo valor.',
      ],
    };
  }

  if (example.id === 'half-adder') {
    return {
      ...common,
      moduleId: 'combinational',
      familyIds: ['adders', 'truth-table'],
      trackIds: ['arithmetic', 'architecture'],
      difficulty: 2,
      level: 'composition',
      prerequisites: [
        {
          note: 'Lembre do XOR: ele liga quando os bits são diferentes. Em uma soma de um único dígito, isso dá exatamente o bit SUM: 0+1 e 1+0 viram 1; 0+0 e 1+1 deixam SUM em 0.',
        },
        {
          note: 'Lembre do AND: ele só liga quando A=1 e B=1. Esse é justamente o único caso em que a soma passa de um bit e precisa mandar 1 para a próxima coluna: o CARRY.',
        },
        { note: 'Se quiser revisar antes, abra XOR básico e AND básico.' },
      ],
      concepts: ['soma binária', 'SUM', 'CARRY'],
      goal: 'Entender como somar dois bits. Quando 1 + 1 gera 10 em binário, o resultado precisa ser dividido em SUM=0 e CARRY=1.',
      steps: [
        'Teste A=0 e B=0. Resultado esperado: SUM=0, CARRY=0.',
        'Teste A=1 e B=0. Resultado esperado: SUM=1, CARRY=0.',
        'Teste A=0 e B=1. Resultado esperado: SUM=1, CARRY=0.',
        'Teste A=1 e B=1. Em binário, 1+1=10: SUM=0 e CARRY=1.',
      ],
      ideas: [
        'Um bit sozinho só representa 0 ou 1.',
        'O resultado de 1+1 precisa de dois bits: 10.',
        'SUM é o bit da coluna atual; CARRY é o bit que vai para a próxima coluna.',
        'Por isso o meio somador tem duas saídas.',
      ],
      next: ['full-adder'],
      observe: [
        'Leia as saídas como CARRY SUM.',
        'SUM segue a mesma regra da XOR.',
        'CARRY segue a mesma regra da AND.',
        'A tabela verdade não mostra só liga/desliga: ela representa uma soma.',
      ],
      experiments: [
        'Some 1+1 e veja que o resultado é 10 em binário: CARRY=1 e SUM=0.',
        'Compare a tabela do SUM com a tabela da XOR.',
        'Compare a tabela do CARRY com a tabela da AND.',
      ],
      challenge:
        'Sem olhar a tabela, escreva o resultado de cada soma: 0+0, 0+1, 1+0, 1+1. Depois confira no circuito.',
      exercises: [
        'Monte uma tabela com A, B, soma decimal, SUM e CARRY.',
        'Explique por que SUM é igual a A XOR B.',
        'Explique por que CARRY é igual a A AND B.',
      ],
    };
  }

  if (example.id === 'full-adder') {
    return {
      ...common,
      moduleId: 'combinational',
      familyIds: ['adders', 'truth-table'],
      trackIds: ['arithmetic', 'architecture'],
      difficulty: 3,
      level: 'composition',
      prerequisites: ['half-adder'],
      concepts: ['carry de entrada', 'carry de saída', 'soma de coluna'],
      goal: 'Entender como somar uma coluna que já recebeu transporte. O somador completo soma A + B + Cin e pode produzir SUM e Cout.',
      steps: [
        'Teste A=1, B=0, Cin=0.',
        'Agora ligue Cin e observe a diferença.',
        'Teste A=1, B=1, Cin=1.',
        'Observe quando Cout liga.',
      ],
      ideas: [
        'Cin é o carry recebido da coluna anterior, como o “vai 1” da conta no papel.',
        'Cout é o carry enviado para a próxima coluna.',
        'Somadores maiores são feitos conectando Cout de uma coluna ao Cin da próxima.',
        'Quando A+B+Cin passa de 1, Cout precisa ligar.',
      ],
      next: ['adder-2-bit'],
      observe: [
        'SUM pode mudar quando Cin muda.',
        'Cout liga quando a soma da coluna passa de 1.',
        'A tabela verdade tem três entradas e duas saídas.',
      ],
      experiments: [
        'Compare 1+0 sem Cin e com Cin.',
        'Procure as combinações em que Cout=1.',
        'Explique o circuito como duas somas parciais.',
      ],
      challenge: 'Monte um somador completo usando dois meio somadores e uma porta OR.',
      exercises: [
        'Preencha a tabela de 8 linhas com A, B, Cin, SUM e Cout.',
        'Encontre todas as combinações que produzem resultado binário 10.',
        'Explique em palavras o que Cin representa.',
      ],
    };
  }

  if (example.id === 'adder-2-bit') {
    return {
      ...common,
      moduleId: 'combinational',
      familyIds: ['adders', 'truth-table'],
      trackIds: ['arithmetic', 'architecture'],
      difficulty: 3,
      level: 'composition',
      prerequisites: ['half-adder', 'full-adder'],
      concepts: ['número de 2 bits', 'propagação de carry', 'composição hierárquica'],
      goal: 'Entender como somar números com mais de um bit. Aqui somamos A1A0 + B1B0 e propagamos o carry da coluna 0 para a coluna 1.',
      steps: [
        'Escolha A1A0=01 e B1B0=01.',
        'Observe S0 e o carry que entra no bit 1.',
        'Teste uma soma que gere Cout, como 11 + 01.',
        'Leia o resultado como Cout S1 S0.',
      ],
      ideas: [
        'A0 e B0 são os bits menos significativos: a coluna da direita.',
        'A1 e B1 são a próxima coluna.',
        'O carry do primeiro bit vira Cin do segundo bit.',
        'Esse padrão de encadear carry é a base dos somadores de 4, 8 ou mais bits.',
      ],
      next: ['half-subtractor'],
      observe: [
        'O fio de CARRY do meio somador entra no Cin do somador completo.',
        'O resultado final tem três bits: Cout S1 S0.',
        'A tabela verdade tem 16 combinações.',
      ],
      experiments: ['Some 01 + 01.', 'Some 10 + 01.', 'Some 11 + 01 e veja Cout aparecer.'],
      challenge:
        'Adicione mais um somador completo para transformar este circuito em um somador de 3 bits.',
      exercises: [
        'Calcule 01 + 10 e confira S1S0.',
        'Calcule 11 + 11 e confira Cout S1 S0.',
        'Desenhe no papel a conexão necessária para criar um somador de 3 bits.',
      ],
    };
  }

  if (
    ['adder-4-bit', 'adder-4-bit-gates', 'subtractor-4-bit', 'subtractor-4-bit-gates'].includes(
      example.id,
    )
  ) {
    const isAdder = example.id.startsWith('adder');
    const isGateLevel = example.id.endsWith('-gates');
    return {
      ...common,
      moduleId: 'combinational',
      familyIds: ['adders', 'truth-table'],
      trackIds: ['arithmetic', 'architecture'],
      difficulty: isGateLevel ? 4 : 3,
      level: 'composition',
      prerequisites: isAdder ? ['adder-2-bit'] : ['adder-4-bit', 'full-subtractor'],
      concepts: isAdder
        ? ['ripple carry', 'número de 4 bits', 'propagação de carry']
        : ['complemento de 2', 'inversão de bits', 'subtração por soma'],
      next: isAdder ? [isGateLevel ? 'subtractor-4-bit-gates' : 'subtractor-4-bit'] : [],
    };
  }

  if (example.id === 'alu-4-bit') {
    return {
      ...common,
      moduleId: 'combinational',
      familyIds: ['adders', 'mux-decoder', 'truth-table'],
      trackIds: ['arithmetic', 'selection', 'architecture'],
      difficulty: 4,
      level: 'system',
      prerequisites: ['adder-4-bit', 'subtractor-4-bit', 'mux-4-1'],
      concepts: ['ULA', 'opcode', 'seleção de operação', 'somador/subtrator compartilhado'],
      next: [],
    };
  }

  if (example.id === 'half-subtractor') {
    return {
      ...common,
      moduleId: 'combinational',
      familyIds: ['adders', 'truth-table'],
      trackIds: ['arithmetic'],
      difficulty: 2,
      level: 'composition',
      prerequisites: ['not-basic', 'and-basic', 'xor'],
      concepts: ['subtração de bits', 'DIFF', 'BORROW'],
      goal: 'Entender como subtrair um bit de outro. Quando tentamos fazer 0 - 1, precisamos pedir emprestado: BORROW=1.',
      steps: [
        'Teste A=0 e B=0.',
        'Teste A=1 e B=0.',
        'Teste A=0 e B=1 e observe BORROW.',
        'Teste A=1 e B=1.',
      ],
      ideas: [
        'DIFF usa XOR, assim como SUM no meio somador.',
        'BORROW liga quando tentamos fazer 0 - 1.',
        'Pedir emprestado em binário é parecido com pedir emprestado em uma subtração decimal.',
        'Subtração também pode ser descrita por tabela verdade.',
      ],
      next: ['full-subtractor'],
      observe: [
        'DIFF indica o bit de diferença.',
        'BORROW indica empréstimo para a próxima coluna.',
        'O caso A=0,B=1 é o mais importante.',
      ],
      experiments: [
        'Compare meio somador e meio subtrator.',
        'Explique por que DIFF é igual ao XOR.',
        'Procure a única linha que liga BORROW.',
      ],
      challenge: 'Explique por que BORROW = !A AND B.',
      exercises: [
        'Preencha a tabela de A, B, DIFF e BORROW.',
        'Monte BORROW usando NOT e AND em uma aba vazia.',
        'Crie um enunciado real para “precisar emprestar”.',
      ],
    };
  }

  if (example.id === 'full-subtractor') {
    return {
      ...common,
      moduleId: 'combinational',
      familyIds: ['adders', 'truth-table'],
      trackIds: ['arithmetic'],
      difficulty: 3,
      level: 'composition',
      prerequisites: ['half-subtractor'],
      concepts: ['borrow de entrada', 'borrow de saída', 'subtração em colunas'],
      goal: 'Entender a subtração de uma coluna que já recebeu empréstimo. O subtrator completo calcula A - B - Bin.',
      steps: [
        'Teste Bin=0 e compare com o meio subtrator.',
        'Ligue Bin e veja como a diferença muda.',
        'Procure combinações que ligam Bout.',
        'Compare Bin com Cin do somador completo.',
      ],
      ideas: [
        'Bin é o empréstimo que chegou da coluna anterior.',
        'Bout é o empréstimo enviado para a próxima coluna.',
        'Subtratores maiores encadeiam Bout para Bin, assim como somadores encadeiam Cout para Cin.',
        'Se a coluna atual não consegue pagar a subtração, ela pede empréstimo.',
      ],
      next: ['comparator-1-bit'],
      observe: [
        'DIFF depende de A, B e Bin.',
        'Bout liga quando a coluna atual precisa emprestar.',
        'A tabela verdade tem 8 linhas.',
      ],
      experiments: [
        'Compare A=1,B=0 com Bin=0 e Bin=1.',
        'Procure todas as linhas que ligam Bout.',
        'Explique o circuito como uma subtração em coluna.',
      ],
      challenge: 'Monte um subtrator de 2 bits encadeando meio subtrator e subtrator completo.',
      exercises: [
        'Preencha a tabela de 8 linhas.',
        'Calcule 0 - 0 - 1 e explique o empréstimo.',
        'Desenhe como seria um subtrator de 2 bits.',
      ],
    };
  }

  if (example.id === 'comparator-1-bit') {
    return {
      ...common,
      moduleId: 'combinational',
      familyIds: ['adders', 'truth-table'],
      trackIds: ['arithmetic', 'selection'],
      difficulty: 2,
      level: 'composition',
      prerequisites: ['and-basic', 'not-basic', 'xnor-basic'],
      concepts: ['maior que', 'igualdade', 'menor que'],
      goal: 'Entender como comparar dois bits e gerar três respostas exclusivas: A>B, A=B ou A<B.',
      steps: ['Teste A=0,B=0.', 'Teste A=1,B=0.', 'Teste A=0,B=1.', 'Teste A=1,B=1 e observe EQ.'],
      ideas: [
        'GT liga quando A=1 e B=0.',
        'LT liga quando A=0 e B=1.',
        'EQ liga quando os bits são iguais, como uma XNOR.',
        'Em um comparador correto, apenas uma dessas três saídas deve ligar por vez.',
      ],
      next: ['mux-2-1'],
      observe: [
        'Apenas uma saída deve ligar por vez.',
        'EQ liga para 00 e 11.',
        'GT e LT são casos opostos.',
      ],
      experiments: [
        'Compare este circuito com o XNOR básico.',
        'Explique por que GT usa A AND !B.',
        'Explique por que LT usa !A AND B.',
      ],
      challenge: 'Pense em como comparar números de 2 bits começando pelo bit mais significativo.',
      exercises: [
        'Crie uma tabela com A, B, GT, EQ e LT.',
        'Monte apenas a saída GT em uma aba vazia.',
        'Monte apenas a saída LT em uma aba vazia.',
      ],
    };
  }
  if (
    [
      'mux-2-1',
      'mux-4-1',
      'decoder-2-4',
      'demux-1-2',
      'encoder-4-2',
      'odd-parity-3',
      'majority-3',
    ].includes(example.id)
  ) {
    return {
      ...common,
      moduleId: 'combinational',
      familyIds: ['mux-decoder'],
      trackIds: ['selection', 'architecture'],
      difficulty: example.id === 'mux-4-1' ? 3 : 2,
      level: 'composition',
      prerequisites: ['and-basic', 'or-basic', 'not-basic'],
      concepts: ['seleção', 'codificação', 'roteamento de sinais'],
      next: ['register-4-basic'],
      challenge: 'Explique qual entrada controla cada caminho até a saída.',
      exercises: [
        'Escolha uma combinação de seleção e preveja qual entrada aparecerá na saída.',
        'Crie uma situação real em que um seletor escolha entre dois sinais.',
        'Teste uma entrada de dados por vez mantendo as demais desligadas.',
      ],
    };
  }
  if (
    [
      'd-latch-basic',
      'sr-latch-nor-experiment',
      'sr-latch-nand-active-low',
      'gated-d-latch-from-nand',
    ].includes(example.id)
  ) {
    return {
      ...common,
      moduleId: 'time-and-state',
      familyIds: ['latches'],
      trackIds: ['sequential'],
      difficulty: example.id === 'gated-d-latch-from-nand' ? 3 : 2,
      level: 'concept',
      prerequisites: ['not-basic', 'nand-not'],
      concepts: ['estado anterior', 'realimentação', 'memória de 1 bit'],
      next: ['d-flip-flop-basic'],
      observe: [
        'Mude as entradas de controle.',
        'Volte para a condição de repouso.',
        'Observe que Q pode manter o valor anterior.',
      ],
      experiments: [
        'Sete o latch, volte para repouso e confirme que Q permanece.',
        'Resete o latch e confirme a mudança de estado.',
      ],
      challenge: 'Compare o latch nativo com o latch construído usando portas comuns.',
      exercises: [
        'Faça uma sequência SET, repouso, RESET, repouso e anote Q em cada etapa.',
        'Mude uma entrada por vez e explique por que o latch mantém ou altera o estado.',
        'Tente encontrar uma condição proibida ou instável e explique por que ela deve ser evitada.',
      ],
    };
  }
  if (example.id === 'd-flip-flop-basic') {
    return {
      ...common,
      moduleId: 'time-and-state',
      familyIds: ['flip-flops'],
      trackIds: ['sequential', 'architecture'],
      difficulty: 2,
      level: 'concept',
      prerequisites: ['d-latch-basic'],
      concepts: ['clock', 'borda de subida', 'estado atual'],
      next: ['register-4-basic'],
      observe: [
        'Altere D antes do Tick.',
        'Pressione Tick e observe se houve borda de subida.',
        'Compare D e Q antes/depois do clock.',
      ],
      experiments: [
        'Altere D na borda de descida e veja que Q não captura.',
        'Use o clock automático em 1 Hz.',
      ],
      challenge: 'Explique por que Q não muda imediatamente quando D muda.',
      exercises: [
        'Coloque D=1 antes da borda de subida e confirme que Q captura 1.',
        'Mude D logo depois da captura e confirme que Q mantém até a próxima subida.',
        'Faça uma tabela de ciclos com CLK, D e Q.',
      ],
    };
  }
  if (example.id === 'register-4-basic') {
    return {
      ...common,
      moduleId: 'time-and-state',
      familyIds: ['registers'],
      trackIds: ['sequential', 'architecture'],
      difficulty: 2,
      level: 'composition',
      prerequisites: ['d-flip-flop-basic'],
      concepts: ['palavra binária', 'carga paralela', 'fronteira temporal'],
      next: ['sync-counter-8bit', 'johnson-counter-8bit'],
      observe: [
        'Ajuste D0–D3 antes do clock.',
        'Dê Tick até uma borda de subida.',
        'Observe Q0–Q3 copiando a palavra de entrada.',
      ],
      experiments: [
        'Mude D0–D3 sem dar clock e confira que Q mantém.',
        'Rode o clock automático e capture várias palavras.',
      ],
      challenge: 'Adicione um enable usando multiplexadores antes das entradas D.',
      exercises: [
        'Capture a palavra 1010 e confirme os LEDs Q3..Q0.',
        'Mude as entradas para 0101 sem clock e confirme que Q não muda.',
        'Capture três palavras diferentes e anote o valor salvo após cada borda de subida.',
      ],
    };
  }
  if (example.id === 'sync-counter-8bit') {
    return {
      ...common,
      moduleId: 'systems',
      familyIds: ['counters', 'flip-flops'],
      trackIds: ['sequential', 'architecture'],
      difficulty: 4,
      level: 'system',
      prerequisites: ['d-flip-flop-basic', 'register-4-basic'],
      concepts: [
        'contador síncrono',
        'cadeia de vai-um (ripple carry enable)',
        'flip-flop T via XOR',
        'todos os estágios no mesmo clock',
      ],
      goal: 'Entender como oito flip-flops D, todos clocados pelo mesmo sinal, compõem um contador binário de 0 a 255 usando uma cadeia combinacional de "habilita a próxima" em vez de encadear os clocks.',
      steps: [
        'Dê alguns Ticks e acompanhe os LEDs Q0..Q7 em binário.',
        'Desligue Enable e confirme que a contagem para sem perder o valor.',
        'Religue Enable e continue de onde parou.',
        'Rode o clock automático e abra as Formas de onda para ver os bits mais altos mudarem de frequência cada vez mais devagar.',
      ],
      ideas: [
        'Cada bit só alterna quando todos os bits menos significativos já estão em 1 — a mesma condição de "vai um" da soma binária.',
        'Como todo Flip-Flop D é clocado pelo mesmo sinal, o valor novo inteiro é decidido em um único instante — sem os atrasos de propagação de um contador assíncrono (ripple) real.',
        'Um Flip-Flop D com D = XOR(Q, T) funciona como um Flip-Flop T: alterna quando T=1, mantém quando T=0.',
        'O bit mais significativo muda com metade da frequência do bit anterior — o padrão clássico de contagem binária.',
        'Este simulador resolve cada Tick num único passo síncrono: primeiro toda a lógica combinacional é calculada a partir do estado anterior, só depois todos os Flip-Flops travam o novo valor ao mesmo tempo. Um circuito com clock único, como este, é exatamente o que esse modelo representa fielmente.',
      ],
      next: ['ripple-counter-broken'],
      observe: [
        'Bit 0 alterna a cada clock; Bit 1 alterna a cada dois clocks; cada bit seguinte é duas vezes mais lento.',
        'Com Enable desligado, nenhum bit muda mesmo com Tick.',
        'No painel de Formas de onda, clique num tick antigo para ver o canvas voltar àquele valor.',
      ],
      experiments: [
        'Conte até 15 e confirme 00001111 nos LEDs.',
        'Desligue Enable no meio da contagem, dê 5 Ticks e confirme que nada mudou.',
        'Rode o clock automático até passar de 255 e observe voltar a 0.',
      ],
      challenge:
        'Explique por que a cadeia de portas AND (T1..T7) precisa olhar todos os bits menos significativos, não só o anterior, para decidir se um bit deve alternar.',
      exercises: [
        'Pare a contagem em 42 (00101010) usando Tick e confirme os LEDs.',
        'Meça quantos Ticks são necessários para o Bit 3 mudar de valor pela primeira vez.',
        'Modifique o circuito (ou desenhe no papel) um contador de 4 bits reaproveitando só os quatro primeiros estágios.',
      ],
    };
  }
  if (example.id === 'ripple-counter-broken') {
    return {
      ...common,
      moduleId: 'systems',
      familyIds: ['counters', 'flip-flops'],
      trackIds: ['sequential', 'architecture'],
      difficulty: 4,
      level: 'concept',
      prerequisites: ['sync-counter-8bit'],
      concepts: [
        'contador ripple assíncrono',
        'atraso de propagação',
        'passo síncrono único por Tick',
        'clock encadeado entre estágios',
      ],
      goal: 'Entender, prevendo e depois observando uma falha real, por que este simulador só representa corretamente circuitos síncronos — e não um contador ripple assíncrono clássico de livro-texto.',
      steps: [
        'Antes de clicar em qualquer coisa, escreva a sequência que você espera: 1, 2, 3, 4, 5, 6...',
        'Dê Tick uma vez e compare o valor dos LEDs com sua previsão.',
        'Continue dando Tick um a um, sempre comparando: 1, 3, 6, 14, 15, 13, 12, 12, 13, 15, 10...',
        'Volte ao exemplo "Contador binário síncrono (8 bits)" e repita os mesmos primeiros Ticks para comparar lado a lado.',
      ],
      ideas: [
        'Este circuito é o desenho clássico de contador ripple: cada Flip-Flop é um T (D = NOT(Q), alterna a cada borda), e o clock de cada estágio vem do Q do estágio anterior.',
        'Em hardware real isso funciona porque cada porta tem um atraso físico de nanossegundos, muito menor que o período do clock — dá tempo de tudo se acomodar entre uma borda e outra.',
        'Este simulador resolve cada Tick como um único passo síncrono: calcula toda a lógica combinacional de uma vez a partir do estado anterior, e só então trava os Flip-Flops — não existe um "meio do caminho" onde um atraso de propagação possa se resolver.',
        'Por isso, cada estágio só "percebe" a mudança do estágio anterior um Tick inteiro depois — e como novos Ticks continuam chegando, várias dessas ondas atrasadas se sobrepõem e o valor deixa de ser uma contagem.',
        'A correção não é uma questão de fiação: é trocar o desenho por um síncrono, com um clock único e uma lógica combinacional decidindo quem deve alternar (veja o contador de 8 bits).',
      ],
      next: [],
      observe: [
        'O valor muda a cada Tick, mas não sobe de 1 em 1 — ele salta de forma imprevisível.',
        'Volte ao contador síncrono e repita os mesmos Ticks: lá a sequência é limpa, 1, 2, 3, 4...',
        'Quanto mais bits o contador tem, mais caótica fica a sequência aqui — o oposto do que se esperaria de "só adicionar mais um atraso".',
      ],
      experiments: [
        'Grave a sequência dos primeiros 10 valores e confirme se bate com 1, 3, 6, 14, 15, 13, 12, 12, 13, 15.',
        'Pause e reinicie o clock automático algumas vezes e veja se o padrão de erro se repete sempre igual (ele deveria, já que é determinístico).',
        'Desconecte o Flip-Flop do Bit 3 e observe se os 3 bits restantes sozinhos também divergem.',
      ],
      challenge:
        'Reprojete este circuito para que ele conte corretamente neste simulador, sem mudar a quantidade de bits — qual é a mudança mínima de fiação necessária?',
      exercises: [
        'Transforme este contador de 4 bits em um síncrono, reaproveitando a ideia do exemplo de 8 bits.',
        'Explique, em uma frase, por que "mais um tick de atraso por estágio" quebra a contagem em vez de só atrasá-la.',
        'Monte uma tabela com tick, valor esperado e valor observado para os primeiros 8 Ticks.',
      ],
    };
  }
  if (example.id === 'johnson-counter-8bit') {
    return {
      ...common,
      moduleId: 'systems',
      familyIds: ['counters', 'flip-flops'],
      trackIds: ['sequential', 'architecture'],
      difficulty: 3,
      level: 'system',
      prerequisites: ['d-flip-flop-basic'],
      concepts: [
        'registrador de deslocamento',
        'realimentação invertida',
        'contador em anel',
        'sequência de estados',
      ],
      goal: 'Entender um contador em anel de Johnson: oito flip-flops em cadeia, cada um copiando o anterior a cada clock, com o último realimentando o primeiro invertido — produzindo um padrão de "luz correndo" com 16 estados.',
      steps: [
        'Dê Ticks um a um e acompanhe o LED aceso caminhando pela fileira.',
        'Continue até os LEDs acesos começarem a apagar na mesma ordem em que acenderam.',
        'Conte quantos Ticks (bordas de subida) até o padrão se repetir.',
        'Rode o clock automático para ver o efeito completo.',
      ],
      ideas: [
        'Um registrador de deslocamento simples só copia Q do estágio anterior para D do próximo, a cada clock.',
        'Realimentar o último estágio invertido no primeiro (em vez de repetir o valor) faz o padrão de 1s crescer, depois o padrão de 0s crescer, sem nunca ficar preso em um único ciclo curto.',
        'Um anel de Johnson de N estágios percorre 2×N estados distintos antes de repetir — aqui, 16.',
        'Diferente do contador binário, cada estado usa exatamente um "degrau" — mais fácil de decodificar visualmente.',
      ],
      next: [],
      observe: [
        'Um novo LED acende a cada borda de subida, sem apagar os anteriores, até todos os 8 acenderem.',
        'Depois disso, os LEDs apagam na mesma ordem em que acenderam.',
        'O ciclo completo dura 16 bordas de subida (32 Ticks).',
      ],
      experiments: [
        'Pare exatamente no estado 11110000 e confirme quantos Ticks levou.',
        'Compare a forma de onda de Q0 com a de Q4: são o mesmo sinal, defasado.',
        'Desconecte a realimentação (INV → Bit 0) e observe o padrão de 1s parar de se repetir.',
      ],
      challenge:
        'Explique por que um anel sem inversão (Q7 direto para D do estágio 0) resultaria em só 2 estados úteis (tudo 0 ou tudo 1), em vez de 16.',
      exercises: [
        'Anote a sequência completa dos 16 estados de Estágio 0..7.',
        'Identifique em qual estado o padrão é um "espelho" do estado inicial.',
        'Descreva como usar os 16 estados de um anel de Johnson para gerar um efeito de luz de neon sequencial.',
      ],
    };
  }
  if (!GENERIC_METADATA_EXAMPLE_IDS.has(example.id)) {
    throw new Error(`Metadados não classificados para o exemplo: ${example.id}`);
  }
  return {
    ...common,
    moduleId: 'systems',
    familyIds: [],
    trackIds: [],
    difficulty: 2,
    level: 'concept',
    prerequisites: [],
    concepts: [],
    next: [],
  };
}

export const CIRCUIT_EXAMPLES: CircuitExample[] = RAW_CIRCUIT_EXAMPLES.map((example) => ({
  ...example,
  ...metadataFor(example),
}));

export function validateExampleCatalog(examples: CircuitExample[] = CIRCUIT_EXAMPLES): void {
  const expectedIds = new Set<CircuitExampleId>(CIRCUIT_EXAMPLE_IDS);
  const actualIds = new Set<string>();
  for (const example of examples) {
    if (actualIds.has(example.id)) throw new Error(`ID de exemplo duplicado: ${example.id}`);
    actualIds.add(example.id);
  }
  for (const id of expectedIds) {
    if (!actualIds.has(id)) throw new Error(`Exemplo declarado sem documento: ${id}`);
  }
  if (actualIds.size !== expectedIds.size) {
    throw new Error('O catálogo contém exemplos não declarados em CIRCUIT_EXAMPLE_IDS.');
  }
  for (const example of examples) {
    const references = [
      ...example.next,
      ...example.prerequisites.filter((item): item is CircuitExampleId => typeof item === 'string'),
    ];
    for (const reference of references) {
      if (!actualIds.has(reference)) {
        throw new Error(`Referência inexistente em ${example.id}: ${reference}`);
      }
    }
  }
}

validateExampleCatalog();

function lesson(
  id: string,
  title: string,
  description: string,
  exampleIds: CircuitExampleId[],
): CircuitLesson {
  const examples = exampleIds.map((exampleId) => {
    const example = CIRCUIT_EXAMPLES.find((candidate) => candidate.id === exampleId);
    if (!example) throw new Error(`Exemplo não encontrado: ${exampleId}`);
    return example;
  });
  return { id, title, description, exampleIds, examples };
}

function extractExampleDescription(circuit: CircuitDocument): string {
  return circuit.components.find((component) => component.type === 'text')?.label ?? '';
}

export const CIRCUIT_LESSONS: CircuitLesson[] = [
  lesson(
    'first-steps',
    'Aula 1 — Sinais e portas básicas',
    'Começa do zero: o que é um sinal 0/1, como fios transportam sinais, como LEDs observam saídas e como NOT, AND, OR, XOR, NAND, NOR e XNOR transformam entradas.',
    [
      'signal-led-basic',
      'not-basic',
      'and-basic',
      'or-basic',
      'xor',
      'nand-basic',
      'nor-basic',
      'xnor-basic',
      'nand-not',
      'microwave-safety-challenge',
    ],
  ),
  lesson(
    'truth-tables',
    'Aula 2 — Aritmética binária',
    'Use tabela verdade para entender soma, transporte, empréstimo e comparação de bits.',
    [
      'half-adder',
      'full-adder',
      'adder-2-bit',
      'adder-4-bit',
      'adder-4-bit-gates',
      'half-subtractor',
      'full-subtractor',
      'subtractor-4-bit',
      'subtractor-4-bit-gates',
      'comparator-1-bit',
      'alu-4-bit',
    ],
  ),
  lesson(
    'combinational-blocks',
    'Aula 3 — Seleção e codificação',
    'Multiplexadores, decodificadores, encoders e detectores combinacionais.',
    ['mux-2-1', 'mux-4-1', 'decoder-2-4', 'demux-1-2', 'encoder-4-2', 'odd-parity-3', 'majority-3'],
  ),
  lesson(
    'memory-latches',
    'Aula 4 — Memória e latches',
    'Primeiros circuitos que mantêm estado, tanto nativos quanto por realimentação.',
    [
      'd-latch-basic',
      'sr-latch-nor-experiment',
      'sr-latch-nand-active-low',
      'gated-d-latch-from-nand',
    ],
  ),
  lesson(
    'clocked-systems',
    'Aula 5 — Clock, flip-flops e registradores',
    'Circuitos sincronizados pelo Tick ou pelo clock automático.',
    [
      'd-flip-flop-basic',
      'register-4-basic',
      'sync-counter-8bit',
      'ripple-counter-broken',
      'johnson-counter-8bit',
    ],
  ),
];
