import type { Settings } from "../settings";
import type { RouteKind } from "../site/routes";
import type { Feature } from "./feature";

export interface RegisteredFeature {
  readonly name: string;
  readonly feature: Feature;
}

const modules = import.meta.glob<Feature | undefined>(
  [
    "../../entrypoints/scf.content/features/*.{ts,tsx}",
    "../../entrypoints/scf.content/features/*/index.{ts,tsx}",
    "!**/*.stories.tsx",
  ],
  { eager: true, import: "feature" },
);

function nameOf(path: string): string {
  const parts = path.split("/");
  const file = parts.at(-1) ?? "";
  const base = file.startsWith("index.") ? (parts.at(-2) ?? file) : file;
  return base
    .replace(/\.tsx?$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}

function isFeature(value: unknown): value is Feature {
  return (
    typeof value === "object" &&
    value !== null &&
    "mount" in value &&
    typeof value.mount === "function" &&
    "pages" in value &&
    Array.isArray(value.pages)
  );
}

const FEATURES: readonly RegisteredFeature[] = Object.entries(modules).flatMap(
  ([path, feature]) =>
    isFeature(feature) ? [{ name: nameOf(path), feature }] : [],
);

export function featuresFor(
  kind: RouteKind,
  settings: Settings,
): RegisteredFeature[] {
  return FEATURES.filter(
    ({ feature }) =>
      feature.pages.includes(kind) &&
      (feature.toggles === undefined ||
        feature.toggles.some((key) => settings[key])),
  );
}
