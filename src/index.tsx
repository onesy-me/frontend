import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import * as sw from './sw';

const root = ReactDOM.createRoot(
  document.getElementById('onesy-root') as HTMLElement
);

root.render(<App />);

sw.register();
