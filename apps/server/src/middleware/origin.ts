import { createMiddleware } from 'hono/factory';

export interface OriginOptions {
  allowedExtensionIds: readonly string[];
  development: boolean;
}

const EXTENSION_ORIGIN = /^chrome-extension:\/\/([a-p]{32})$/;
const LOCALHOST_ORIGIN = /^http:\/\/localhost(:\d{1,5})?$/;

function isAllowedOrigin(origin: string | undefined, options: OriginOptions): boolean {
  if (origin === undefined) {
    return false;
  }
  const extension = EXTENSION_ORIGIN.exec(origin);
  if (extension !== null) {
    const id = extension[1];
    return id !== undefined && options.allowedExtensionIds.includes(id);
  }
  return options.development && LOCALHOST_ORIGIN.test(origin);
}

export function origin(options: OriginOptions) {
  return createMiddleware(async (c, next) => {
    const requestOrigin = c.req.header('origin');
    const allowed = isAllowedOrigin(requestOrigin, options);
    const looksLikeExtension = requestOrigin !== undefined && EXTENSION_ORIGIN.test(requestOrigin);
    if (requestOrigin === undefined || (!allowed && !looksLikeExtension)) {
      return c.json({ error: 'forbidden_origin' }, 403);
    }
    c.header('Access-Control-Allow-Origin', requestOrigin);
    c.header('Vary', 'Origin');
    if (c.req.method === 'OPTIONS') {
      c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      c.header('Access-Control-Allow-Headers', 'content-type, x-bscf-client, x-bscf-version');
      c.header('Access-Control-Max-Age', '600');
      return c.body(null, 204);
    }
    if (!allowed) return c.json({ error: 'forbidden_origin' }, 403);
    await next();
    return undefined;
  });
}
