interface SubcircuitPlacementBannerProps {
  name: string;
  onCancel: () => void;
}

export function SubcircuitPlacementBanner({ name, onCancel }: SubcircuitPlacementBannerProps) {
  return (
    <div className="subcircuit-placement-banner" role="status">
      <span>
        <strong>{name}</strong> pronto para posicionar. Clique no canvas para inserir outra
        instância; <kbd>Escape</kbd> cancela.
      </span>
      <button type="button" onClick={onCancel}>
        Cancelar posicionamento
      </button>
    </div>
  );
}
