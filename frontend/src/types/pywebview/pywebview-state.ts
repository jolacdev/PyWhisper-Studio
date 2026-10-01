import type { BridgeState } from './pywebview-api';

export type PyWebViewStateEvent = CustomEvent<{
  key: 'studio';
  value: BridgeState['studio'];
}>;

/** Add transport events to the state generated from Python. */
export type PyWebViewState = Readonly<BridgeState> & {
  addEventListener(
    type: 'change',
    callback: (event: PyWebViewStateEvent) => void,
  ): void;
  removeEventListener(
    type: 'change',
    callback: (event: PyWebViewStateEvent) => void,
  ): void;
};
