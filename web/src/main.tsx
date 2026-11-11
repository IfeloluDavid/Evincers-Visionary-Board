import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/dancing-script';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/fraunces/soft.css';
import '@fontsource-variable/fraunces/soft-italic.css';
import App from './App';
import { loadConfig } from './config';
import './styles.css';

const root = createRoot(document.getElementById('root')!);

loadConfig()
  .then(() =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  )
  .catch((err: Error) =>
    root.render(
      <div className="fatal">
        <h1 className="script-title">Evincers Vision Board</h1>
        <p>{err.message}</p>
      </div>,
    ),
  );
