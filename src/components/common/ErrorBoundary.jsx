import React from 'react';
import Card from './Card';

// Egy hibás jelentés eddig az egész oldalt elvitte: a React lebontja a teljes
// fát, és fehér képernyő marad, a hibaüzenet meg csak a böngésző konzoljában.
// Ez a határ a hibát a helyén tartja, kiírja olvashatóan, és a rendszer többi
// része használható marad.
// Egy telepítés után a régi, hash-elt JS darabok eltűnnek a szerverről. Egy
// addig nyitva hagyott fül még a régi neveket kéri, és amikor odalapoz, a
// dinamikus import 404-re fut – ez is fehér képernyőt ad, pedig csak régi a fül.
// Ilyenkor egyszer újratöltünk; a jelzőt időbélyeggel tároljuk, hogy egy hibás
// oldal ne tudjon végtelen újratöltésbe kergetni.
const RELOAD_FLAG = 'pepper_chunk_reload_at';
const RELOAD_COOLDOWN_MS = 30_000;

function isChunkLoadError(error) {
  const message = String(error?.message || error || '');
  return /dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk \S+ failed/i.test(
    message
  );
}

function reloadOnceForChunkError() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_FLAG) || 0);
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return false;
    sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
  } catch {
    // Ha a sessionStorage nem elérhető, inkább ne töltsünk újra (ciklus veszély).
    return false;
  }
  window.location.reload();
  return true;
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Hiba a megjelenítés közben:', error, info?.componentStack);
    if (this.props.reloadOnChunkError && isChunkLoadError(error)) {
      reloadOnceForChunkError();
    }
  }

  componentDidUpdate(prevProps) {
    // Ha a szülő más tartalmat kér (pl. másik jelentéstípus), próbáljuk újra:
    // különben a hibaüzenet ott ragadna a váltás után is.
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      if (this.props.reloadOnChunkError && isChunkLoadError(this.state.error)) {
        return (
          <Card title="Új verzió érkezett">
            <p className="text-sm text-gray-700">
              Időközben frissült a rendszer, ezért ez a fül elavult. Töltsd újra az oldalt.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 rounded-lg bg-pepper-red px-4 py-2 text-sm font-medium text-white"
            >
              Újratöltés
            </button>
          </Card>
        );
      }
      return (
        <Card title={this.props.title || 'Hiba a megjelenítés közben'}>
          <p className="text-sm text-gray-700">
            Ezt a nézetet nem sikerült megjeleníteni. A rendszer többi része működik – válts másik
            jelentésre, vagy töltsd újra az oldalt.
          </p>
          <pre className="mt-3 overflow-auto rounded bg-red-50 p-3 text-xs text-red-800">
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <p className="mt-2 text-xs text-gray-500">
            Ha visszatérően előfordul, küldd el ezt a szöveget – ebből pontosan látszik, mi a hiba.
          </p>
        </Card>
      );
    }
    return this.props.children;
  }
}
