import { defineContentScript } from 'wxt/utils/define-content-script';

export default defineContentScript({
  matches: ['https://communityfund.stellar.org/*'],
  runAt: 'document_idle',
  cssInjectionMode: 'ui',
  main() {},
});
