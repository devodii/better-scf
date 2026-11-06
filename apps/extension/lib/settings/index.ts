import { z } from "zod";
import { defineStorageItem } from "../db/storage";

const settingsSchema = z.object({
  navigationMemory: z.boolean().default(true),
  trackChips: z.boolean().default(true),
  awardedChip: z.boolean().default(true),
  commentsChip: z.boolean().default(true),
  avatarStack: z.boolean().default(true),
  loadProposalPages: z.boolean().default(true),
  readState: z.boolean().default(true),
  showOpenedInsteadOfUnread: z.boolean().default(false),
  shortlistAndStance: z.boolean().default(true),
  coverNormalization: z.boolean().default(true),
  hoverZoom: z.boolean().default(true),
  gridTools: z.boolean().default(true),
  keyboardShortcuts: z.boolean().default(true),
  roundHeader: z.boolean().default(true),
  tableOfContents: z.boolean().default(true),
  trancheSummary: z.boolean().default(true),
  addressPills: z.boolean().default(true),
  reviewerBar: z.boolean().default(true),
  teamAvatars: z.boolean().default(true),
  imageLightbox: z.boolean().default(true),
  shareButton: z.boolean().default(true),
  aiDock: z.boolean().default(true),
  includeRepositoryLink: z.boolean().default(false),
  debugLogging: z.boolean().default(false),
});

export type Settings = z.infer<typeof settingsSchema>;

export type FeatureKey = {
  [K in keyof Settings]: Settings[K] extends boolean ? K : never;
}[keyof Settings];

export const DEFAULT_SETTINGS: Settings = settingsSchema.parse({});

export const settingsItem = defineStorageItem<Settings>({
  key: "settings",
  schema: settingsSchema,
  defaults: DEFAULT_SETTINGS,
});
