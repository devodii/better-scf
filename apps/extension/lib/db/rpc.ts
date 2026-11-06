import {
  defineExtensionMessaging,
  type ExtensionMessenger,
  type GetDataType,
  type GetReturnType,
} from "@webext-core/messaging";
import {
  type ChatMessage,
  chatMessageSchema,
  type HorizonSummary,
  horizonSummarySchema,
  type NavState,
  navStateSchema,
  type Project,
  parseWith,
  projectSchema,
  type ReviewState,
  type Round,
  reviewStateSchema,
  roundSchema,
  type Submission,
  submissionSchema,
} from "shared";
import { z } from "zod";
import { DbError } from "./errors";
import { type Cached, createMirror, type Mirror, type Repo } from "./repo";
import {
  type AvatarRecord,
  avatarRecordSchema,
  type ProjectIndexRecord,
  projectIndexRecordSchema,
  TTL_MS,
} from "./schema";

export interface RpcProtocol {
  getSubmission(id: string): Cached<Submission> | null;
  putSubmissions(submissions: Submission[]): void;
  listSubmissionsByRound(roundId: string): Cached<Submission>[];
  listSubmissionsByProject(projectId: string): Cached<Submission>[];

  getProject(id: string): Cached<Project> | null;
  putProject(project: Project): void;
  mergeProject(project: Project): Project;

  getRound(id: string): Cached<Round> | null;
  putRound(round: Round): void;

  getReview(submissionId: string): ReviewState | null;
  putReview(review: ReviewState): void;
  listReviews(): ReviewState[];
  markOpened(submissionId: string): ReviewState;

  getNavState(routeKey: string): NavState | null;
  putNavState(state: NavState): void;

  listChat(submissionId: string): ChatMessage[];
  putChatMessage(message: ChatMessage): void;
  clearChat(submissionId: string): void;

  getHorizon(accountId: string): Cached<HorizonSummary> | null;
  putHorizon(summary: HorizonSummary): void;

  getAvatar(handleKey: string): Cached<AvatarRecord> | null;
  putAvatar(avatar: AvatarRecord): void;

  getProjectIndex(): Cached<ProjectIndexRecord> | null;
  putProjectIndex(index: ProjectIndexRecord): void;

  clearCache(): void;
  getClientId(): string;
}

export type RpcType = keyof RpcProtocol;
export type RpcInput<K extends RpcType> = GetDataType<RpcProtocol[K]>;
export type RpcOutput<K extends RpcType> = GetReturnType<RpcProtocol[K]>;

const idSchema = z.string().min(1);

const rpcInputSchemas: { [K in RpcType]: z.ZodType<RpcInput<K>> } = {
  getSubmission: idSchema,
  putSubmissions: z.array(submissionSchema),
  listSubmissionsByRound: idSchema,
  listSubmissionsByProject: idSchema,
  getProject: idSchema,
  putProject: projectSchema,
  mergeProject: projectSchema,
  getRound: idSchema,
  putRound: roundSchema,
  getReview: idSchema,
  putReview: reviewStateSchema,
  listReviews: z.undefined(),
  markOpened: idSchema,
  getNavState: idSchema,
  putNavState: navStateSchema,
  listChat: idSchema,
  putChatMessage: chatMessageSchema,
  clearChat: idSchema,
  getHorizon: idSchema,
  putHorizon: horizonSummarySchema,
  getAvatar: idSchema,
  putAvatar: avatarRecordSchema,
  getProjectIndex: z.undefined(),
  putProjectIndex: projectIndexRecordSchema,
  clearCache: z.undefined(),
  getClientId: z.undefined(),
};

export type RpcMessenger = ExtensionMessenger<RpcProtocol>;

export const { sendMessage, onMessage } =
  defineExtensionMessaging<RpcProtocol>();

export interface RpcDeps {
  getRepo: () => Promise<Repo>;
  getClientId: () => Promise<string>;
}

type RpcHandlers = {
  [K in RpcType]: (input: RpcInput<K>) => Promise<RpcOutput<K>>;
};

export function createRpcHandlers(deps: RpcDeps): RpcHandlers {
  const repo = deps.getRepo;
  return {
    getSubmission: async (id) => (await repo()).getSubmission(id),
    putSubmissions: async (submissions) =>
      (await repo()).putSubmissions(submissions),
    listSubmissionsByRound: async (id) =>
      (await repo()).listSubmissionsByRound(id),
    listSubmissionsByProject: async (id) =>
      (await repo()).listSubmissionsByProject(id),
    getProject: async (id) => (await repo()).getProject(id),
    putProject: async (project) => (await repo()).putProject(project),
    mergeProject: async (project) => (await repo()).mergeProject(project),
    getRound: async (id) => (await repo()).getRound(id),
    putRound: async (round) => (await repo()).putRound(round),
    getReview: async (id) => (await repo()).getReview(id),
    putReview: async (review) => (await repo()).putReview(review),
    listReviews: async () => (await repo()).listReviews(),
    markOpened: async (id) => (await repo()).markOpened(id),
    getNavState: async (routeKey) => (await repo()).getNavState(routeKey),
    putNavState: async (state) => (await repo()).putNavState(state),
    listChat: async (id) => (await repo()).listChat(id),
    putChatMessage: async (message) => (await repo()).putChatMessage(message),
    clearChat: async (id) => (await repo()).clearChat(id),
    getHorizon: async (id) => (await repo()).getHorizon(id),
    putHorizon: async (summary) => (await repo()).putHorizon(summary),
    getAvatar: async (key) => (await repo()).getAvatar(key),
    putAvatar: async (avatar) => (await repo()).putAvatar(avatar),
    getProjectIndex: async () => (await repo()).getProjectIndex(),
    putProjectIndex: async (index) => (await repo()).putProjectIndex(index),
    clearCache: async () => (await repo()).clearCache(),
    getClientId: () => deps.getClientId(),
  };
}

export function registerRpcHandlers(
  handlers: RpcHandlers,
  messenger: Pick<RpcMessenger, "onMessage"> = { onMessage },
): void {
  function register<K extends RpcType>(type: K): void {
    messenger.onMessage(type, async (message) => {
      const parsed = parseWith(rpcInputSchemas[type], message.data);
      if (!parsed.ok) throw DbError.invalidPayload(type, parsed.error);
      return handlers[type](parsed.data);
    });
  }
  for (const type of Object.keys(rpcInputSchemas) as RpcType[]) {
    register(type);
  }
}

export interface RpcClient {
  peekSubmission(id: string): Cached<Submission> | undefined;
  getSubmission(id: string): Promise<Cached<Submission> | null>;
  putSubmissions(submissions: Submission[]): Promise<void>;

  peekProject(id: string): Cached<Project> | undefined;
  getProject(id: string): Promise<Cached<Project> | null>;
  putProject(project: Project): Promise<void>;
  mergeProject(project: Project): Promise<Project>;

  peekRound(id: string): Cached<Round> | undefined;
  getRound(id: string): Promise<Cached<Round> | null>;
  putRound(round: Round): Promise<void>;

  peekReview(submissionId: string): ReviewState | undefined;
  getReview(submissionId: string): Promise<ReviewState | null>;
  putReview(review: ReviewState): Promise<void>;
  markOpened(submissionId: string): Promise<ReviewState>;

  peekHorizon(accountId: string): Cached<HorizonSummary> | undefined;
  getHorizon(accountId: string): Promise<Cached<HorizonSummary> | null>;
  putHorizon(summary: HorizonSummary): Promise<void>;

  getProjectIndex(): Promise<Cached<ProjectIndexRecord> | null>;
  putProjectIndex(index: ProjectIndexRecord): Promise<void>;

  clearCache(): Promise<void>;
  clearMirrors(): void;
}

function fresh<T>(value: T, fetchedAt: number): Cached<T> {
  return { value, fetchedAt, stale: false };
}

export function createRpcClient(
  messenger: Pick<RpcMessenger, "sendMessage"> = { sendMessage },
): RpcClient {
  const submissions = createMirror<Submission>({ ttlMs: TTL_MS.submissions });
  const projects = createMirror<Project>({ ttlMs: TTL_MS.projects });
  const rounds = createMirror<Round>({ ttlMs: TTL_MS.rounds });
  const reviews: Mirror<ReviewState> = createMirror();
  const horizon = createMirror<HorizonSummary>({ ttlMs: TTL_MS.horizon });

  const clearMirrors = (): void => {
    submissions.clear();
    projects.clear();
    rounds.clear();
    reviews.clear();
    horizon.clear();
  };

  return {
    peekSubmission: (id) => submissions.peek(id),
    getSubmission: (id) =>
      submissions.readThrough(id, () =>
        messenger.sendMessage("getSubmission", id),
      ),
    async putSubmissions(list) {
      await messenger.sendMessage("putSubmissions", list);
      for (const s of list) submissions.set(s.id, fresh(s, s.fetchedAt));
    },

    peekProject: (id) => projects.peek(id),
    getProject: (id) =>
      projects.readThrough(id, () => messenger.sendMessage("getProject", id)),
    async putProject(project) {
      await messenger.sendMessage("putProject", project);
      projects.set(project.id, fresh(project, project.fetchedAt));
    },
    async mergeProject(project) {
      const merged = await messenger.sendMessage("mergeProject", project);
      projects.set(merged.id, fresh(merged, merged.fetchedAt));
      return merged;
    },

    peekRound: (id) => rounds.peek(id),
    getRound: (id) =>
      rounds.readThrough(id, () => messenger.sendMessage("getRound", id)),
    async putRound(round) {
      await messenger.sendMessage("putRound", round);
      rounds.set(round.id, fresh(round, round.fetchedAt));
    },

    peekReview: (id) => reviews.peek(id),
    getReview: (id) =>
      reviews.readThrough(id, () => messenger.sendMessage("getReview", id)),
    async putReview(review) {
      await messenger.sendMessage("putReview", review);
      reviews.set(review.submissionId, review);
    },
    async markOpened(submissionId) {
      const review = await messenger.sendMessage("markOpened", submissionId);
      reviews.set(submissionId, review);
      return review;
    },

    peekHorizon: (id) => horizon.peek(id),
    getHorizon: (id) =>
      horizon.readThrough(id, () => messenger.sendMessage("getHorizon", id)),
    async putHorizon(summary) {
      await messenger.sendMessage("putHorizon", summary);
      horizon.set(summary.accountId, fresh(summary, summary.fetchedAt));
    },

    getProjectIndex: () => messenger.sendMessage("getProjectIndex", undefined),
    async putProjectIndex(index) {
      await messenger.sendMessage("putProjectIndex", index);
    },

    async clearCache() {
      await messenger.sendMessage("clearCache", undefined);
      clearMirrors();
    },

    clearMirrors,
  };
}
