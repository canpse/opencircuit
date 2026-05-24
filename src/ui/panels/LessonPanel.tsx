import { CURRICULUM_FAMILIES, CURRICULUM_MODULES, CURRICULUM_TRACKS, type CircuitExample } from '../../examples/circuitExamples';

export function LessonPanel({ example, examples, onLoadExample }: { example: CircuitExample | null; examples: CircuitExample[]; onLoadExample: (exampleId: string) => void }) {
  if (!example) {
    return (
      <div className="properties-card muted-card lesson-empty">
        Carregue um exemplo em <strong>Aulas</strong> para ver objetivo, conceitos, experimentos e próximos caminhos.
      </div>
    );
  }

  const module = CURRICULUM_MODULES.find((item) => item.id === example.moduleId);
  const tracks = CURRICULUM_TRACKS.filter((item) => example.trackIds.includes(item.id));
  const families = CURRICULUM_FAMILIES.filter((item) => example.familyIds.includes(item.id));

  return (
    <div className="lesson-panel-content">
      <div className="properties-card lesson-hero-card">
        <span className="property-subtitle">{module?.title ?? 'Lição'}</span>
        <h3>{example.name}</h3>
        <p>{example.description}</p>
        <div className="lesson-tags">
          <span>Dificuldade {example.difficulty}/5</span>
          <span>{levelLabel(example.level)}</span>
          {tracks.map((track) => <span key={track.id}>{track.title}</span>)}
          {families.map((family) => <span key={family.id}>{family.title}</span>)}
        </div>
      </div>

      <LessonSection title="Conceitos" items={example.concepts} />
      <LessonSection title="Pré-requisitos" items={example.prerequisites} empty="Sem pré-requisitos formais." examples={examples} onItemClick={onLoadExample} />
      <LessonSection title="O que observar" items={example.observe} />
      <LessonSection title="Experimentos" items={example.experiments} />

      {example.challenge && (
        <div className="properties-card lesson-challenge-card">
          <span className="property-subtitle">Desafio</span>
          <p>{example.challenge}</p>
        </div>
      )}

      <LessonSection title="Próximos caminhos" items={example.next} empty="Você chegou ao fim desta trilha por enquanto." examples={examples} onItemClick={onLoadExample} />
    </div>
  );
}

function LessonSection({ title, items, empty, examples = [], onItemClick }: { title: string; items: string[]; empty?: string; examples?: CircuitExample[]; onItemClick?: (item: string) => void }) {
  const exampleById = new Map(examples.map((example) => [example.id, example]));
  return (
    <div className="properties-card lesson-section-card">
      <span className="property-subtitle">{title}</span>
      {items.length === 0 ? (
        <p className="muted-card">{empty ?? 'Nada listado.'}</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item}>
              {onItemClick && exampleById.has(item)
                ? <button className="lesson-link-button" onClick={() => onItemClick(item)}>{exampleById.get(item)?.name}</button>
                : item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function levelLabel(level: CircuitExample['level']): string {
  if (level === 'concept') return 'Conceito isolado';
  if (level === 'composition') return 'Composição';
  return 'Sistema';
}
