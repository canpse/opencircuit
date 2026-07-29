export function LocalAutosaveWarning({ onDownload }: { onDownload: () => void }) {
  return (
    <div className="local-autosave-warning" role="alert">
      <div>
        <strong>O autosave local falhou.</strong>
        <span>
          Seus circuitos continuam abertos nesta sessão, mas alterações podem ser perdidas ao
          recarregar ou fechar o navegador.
        </span>
      </div>
      <button type="button" onClick={onDownload}>
        Baixar JSON agora
      </button>
    </div>
  );
}
