import { Component, type ReactNode } from 'react';

interface Props {
  fallback: ReactNode;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// A WebGL/splat failure (no GPU, malformed scan) would otherwise crash the whole
// dashboard. Contain it so the rest of the demo keeps working.
export class SplatErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(): void {
    /* swallowed: the fallback UI is enough for the demo */
  }

  render(): ReactNode {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
