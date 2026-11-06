import type { FeatureKey, Settings } from "../settings";
import type { RouteKind } from "../site/routes";
import type { PageData, SiteStore } from "../site/store";
import type { MountedUi, MountOptions } from "./mount";

export type FeatureMountOptions = Omit<MountOptions, "name"> & {
  name?: string;
};

export interface FeatureContext {
  readonly name: string;
  readonly page: PageData;
  readonly settings: Settings;
  readonly store: SiteStore;
  readonly region: Element;
  readonly signal: AbortSignal;
  mount(options: FeatureMountOptions): Promise<MountedUi | null>;
  onMutation(listener: () => void): void;
  warn(scope: string, error?: unknown): void;
}

export type FeatureCleanup = () => void;

type MaybeCleanup = FeatureCleanup | undefined;

export interface Feature {
  readonly pages: readonly RouteKind[];
  readonly toggles?: readonly FeatureKey[];
  mount(
    context: FeatureContext,
  ): void | MaybeCleanup | Promise<void> | Promise<MaybeCleanup>;
}
