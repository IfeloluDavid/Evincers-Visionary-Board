import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
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
        <h1>Evincers Vision Board</h1>
        <p>{err.message}</p>
      </div>,
    ),
  );
