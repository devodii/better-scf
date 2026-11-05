import { defineBackground } from 'wxt/utils/define-background';
import { createRepoProvider, createRpcHandlers, getClientId, registerRpcHandlers } from '../lib/db';

export default defineBackground(() => {
  registerRpcHandlers(createRpcHandlers({ getRepo: createRepoProvider(), getClientId }));
});
