import type { PersistencePresentation } from './documentPersistence';

interface PersistenceIndicatorProps {
  presentation: PersistencePresentation;
}

export function PersistenceIndicator({ presentation }: PersistenceIndicatorProps) {
  return (
    <span
      className={`persistence-indicator ${presentation.tone}`}
      aria-label={`${presentation.destinationLabel}: ${presentation.statusLabel}`}
    >
      <strong>{presentation.destinationLabel}</strong>
      <span>{presentation.statusLabel}</span>
    </span>
  );
}
