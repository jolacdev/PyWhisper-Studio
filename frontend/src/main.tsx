import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App.tsx';
import PyWebViewProvider from './PyWebViewProvider.tsx';
import { PyWebViewApiType as PyWebViewApi } from './types/pywebview/pywebview-api';
import { PyWebViewState } from './types/pywebview/pywebview-state.ts';

import './i18n/i18n.ts';

import './index.css';

declare global {
  interface Window {
    pywebview: {
      // The `api` object is exposed from Python, contains declared Python methods passed with the `js_api` parameter.
      // NOTE: This type has been auto-generated from `api.py` definition using PyFlow + TSC.
      api: PyWebViewApi;
      // The `state` object exposed by Python provides bidirectional shared data between Python and JS.
      // It can be updated from either side, and any change triggers a change or delete event with the respective `key` and `value` in `event.detail`.
      // More information - https://pywebview.flowrl.com/guide/interdomain.html#shared-state
      state: PyWebViewState;
    };
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PyWebViewProvider isStandalone={false}>
      <App />
    </PyWebViewProvider>
  </React.StrictMode>,
);
