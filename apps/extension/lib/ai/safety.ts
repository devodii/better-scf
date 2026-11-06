import { buildEndpointPath, endpoints } from "../site/catalog/endpoints";
import {
  matchPath,
  type PathParams,
  patternToRegex,
} from "../site/catalog/pattern";

export type ToolGate = "run" | "confirm";

const compiled = endpoints.map((endpoint) => ({
  personal: endpoint.personal,
  regex: patternToRegex(endpoint.path),
}));

function stringParams(value: unknown): PathParams {
  const params: PathParams = {};
  if (typeof value !== "object" || value === null) return params;
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string") params[key] = item;
  }
  return params;
}

function isPersonalBackendCall(input: unknown): boolean {
  if (typeof input !== "object" || input === null) return false;
  const endpoint: unknown = Reflect.get(input, "endpoint");
  if (typeof endpoint !== "string") return false;
  const id = endpoint.trim();
  const path = id.startsWith("/")
    ? id
    : buildEndpointPath(id, stringParams(Reflect.get(input, "params")));
  if (path === null) return false;
  return (
    compiled.find(({ regex }) => matchPath(regex, path))?.personal ?? false
  );
}

export function gateFor(
  toolName: string,
  input: unknown,
  isUserInitiated: boolean,
): ToolGate {
  if (isUserInitiated) return "run";
  if (toolName === "navigate") return "confirm";
  if (toolName === "backend_get" && isPersonalBackendCall(input))
    return "confirm";
  return "run";
}
