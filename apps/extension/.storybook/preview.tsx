import type { Preview } from '@storybook/react-vite';
import tokens from '../entrypoints/scf.content/styles/tokens.scss?inline';

const style = document.createElement('style');
style.dataset.bscfTokens = '';
style.textContent = `${tokens.replaceAll(':host', ':root')}
body {
  margin: 0;
  background: var(--bscf-bg);
  color: var(--bscf-text);
  font-family: var(--bscf-font-body);
}`;
document.head.append(style);

const preview: Preview = {
  parameters: { layout: 'padded' },
};

export default preview;
