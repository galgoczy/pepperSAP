import React from 'react';
import Card from './Card';

// Egy hibás jelentés eddig az egész oldalt elvitte: a React lebontja a teljes
// fát, és fehér képernyő marad, a hibaüzenet meg csak a böngésző konzoljában.
// Ez a határ a hibát a helyén tartja, kiírja olvashatóan, és a rendszer többi
// része használható marad.
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
