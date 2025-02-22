import ReactDOM from 'react-dom/client';
import App from './App';

import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(
  document.getElementById('onesy-root') as HTMLElement
);

root.render(<App />);

serviceWorkerRegistration.register();
