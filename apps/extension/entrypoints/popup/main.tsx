import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import tokens from '../scf.content/styles/tokens.scss?inline';
import { App } from './App';
import './tokens.scss';

const tokenStyle = document.createElement('style');
tokenStyle.textContent = tokens.replaceAll(':host', ':root');
document.head.append(tokenStyle);

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
