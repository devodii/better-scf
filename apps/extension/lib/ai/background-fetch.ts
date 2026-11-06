import { browser } from "wxt/browser";

const PORT_NAME = "bscf-fetch";
const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);
const BASE64_STEP = 0x8000;

type Header = [string, string];

type Request =
  | {
      type: "start";
      url: string;
      method: string;
      headers: Header[];
      body: string | null;
    }
  | { type: "abort" };

type Frame =
  | { type: "head"; status: number; statusText: string; headers: Header[] }
  | { type: "chunk"; data: string }
  | { type: "end" }
  | { type: "error"; message: string };

function toBase64(bytes: Uint8Array): string {
  let text = "";
  for (let i = 0; i < bytes.length; i += BASE64_STEP) {
    text += String.fromCharCode(...bytes.subarray(i, i + BASE64_STEP));
  }
  return btoa(text);
}

function fromBase64(data: string): Uint8Array<ArrayBuffer> {
  const text = atob(data);
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) bytes[i] = text.charCodeAt(i);
  return bytes;
}

function abortError(): DOMException {
  return new DOMException("The request was aborted.", "AbortError");
}

export function createBackgroundFetch(): typeof globalThis.fetch {
  return async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const body = init?.body ?? null;
    if (body !== null && typeof body !== "string") {
      throw new TypeError(
        "Only text request bodies can be sent through the extension.",
      );
    }
    const signal = init?.signal ?? undefined;
    if (signal?.aborted) throw abortError();

    const port = browser.runtime.connect({ name: PORT_NAME });
    return new Promise<Response>((resolve, reject) => {
      let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
      let answered = false;
      let finished = false;
      const stream = new ReadableStream<Uint8Array>({
        start(next) {
          controller = next;
        },
        cancel() {
          finished = true;
          port.disconnect();
        },
      });

      const fail = (error: Error): void => {
        if (finished) return;
        finished = true;
        if (answered) controller?.error(error);
        else reject(error);
      };

      signal?.addEventListener(
        "abort",
        () => {
          port.postMessage({ type: "abort" } satisfies Request);
          fail(abortError());
          port.disconnect();
        },
        { once: true },
      );
      port.onMessage.addListener((frame: Frame) => {
        if (frame.type === "head") {
          answered = true;
          resolve(
            new Response(NULL_BODY_STATUSES.has(frame.status) ? null : stream, {
              status: frame.status,
              statusText: frame.statusText,
              headers: frame.headers,
            }),
          );
        } else if (frame.type === "chunk") {
          controller?.enqueue(fromBase64(frame.data));
        } else if (frame.type === "end") {
          finished = true;
          controller?.close();
          port.disconnect();
        } else {
          fail(new TypeError(frame.message));
          port.disconnect();
        }
      });
      port.onDisconnect.addListener(() =>
        fail(new TypeError("The extension connection closed.")),
      );
      port.postMessage({
        type: "start",
        url,
        method: init?.method ?? "GET",
        headers: [...new Headers(init?.headers).entries()],
        body,
      } satisfies Request);
    });
  };
}

export function registerBackgroundFetch(
  allowedOrigins: () => Promise<readonly string[]>,
): void {
  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== PORT_NAME || port.sender?.id !== browser.runtime.id)
      return;
    const controller = new AbortController();
    const send = (frame: Frame): void => {
      if (!controller.signal.aborted) port.postMessage(frame);
    };
    port.onDisconnect.addListener(() => controller.abort());
    port.onMessage.addListener(async (message: Request) => {
      if (message.type === "abort") {
        controller.abort();
        return;
      }
      try {
        const url = new URL(message.url);
        if (!(await allowedOrigins()).includes(url.origin)) {
          throw new Error("That address is not allowed.");
        }
        const response = await fetch(url, {
          method: message.method,
          headers: message.headers,
          ...(message.body === null ? {} : { body: message.body }),
          credentials: "omit",
          signal: controller.signal,
        });
        send({
          type: "head",
          status: response.status,
          statusText: response.statusText,
          headers: [...response.headers.entries()],
        });
        const reader = response.body?.getReader();
        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;
          send({ type: "chunk", data: toBase64(value) });
        }
        send({ type: "end" });
      } catch (error) {
        send({
          type: "error",
          message: error instanceof Error ? error.message : "Request failed.",
        });
      }
    });
  });
}
