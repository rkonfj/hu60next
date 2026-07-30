import { randomUUID } from "node:crypto";
import {
  mkdir,
  open,
  readFile,
  rename,
  stat,
  unlink,
  writeFile
} from "node:fs/promises";
import path from "node:path";

const MAX_OPTIONS = 12;
const LOCK_RETRY_COUNT = 100;
const LOCK_RETRY_DELAY_MS = 40;
const STALE_LOCK_MS = 15_000;

export type VoteDraft = {
  question: string;
  multiple: boolean;
  options: string[];
  closesAt?: number;
};

export type VoteOption = {
  id: string;
  label: string;
  count: number | null;
};

export type VotePoll = {
  topicId: number;
  question: string;
  multiple: boolean;
  closed: boolean;
  closesAt: number | null;
  resultsVisible: boolean;
  totalVoters: number | null;
  options: VoteOption[];
  selectedOptionIds: string[];
};

type StoredVoteOption = Omit<VoteOption, "count"> & {
  count: number;
};

type StoredVotes = {
  question: string;
  multiple: boolean;
  closed: boolean;
  totalVoters: number;
  options: StoredVoteOption[];
  voters: Record<string, string[]>;
  ownerUid?: number;
  closesAt?: number;
  createdAt?: number;
  updatedAt?: number;
};

type TopicDocument = Record<string, unknown> & {
  votes?: unknown;
};

export class VoteStoreError extends Error {
  readonly code:
    | "NOT_FOUND"
    | "INVALID_DATA"
    | "INVALID_SELECTION"
    | "ALREADY_VOTED"
    | "CLOSED"
    | "BUSY";

  constructor(
    message: string,
    code:
      | "NOT_FOUND"
      | "INVALID_DATA"
      | "INVALID_SELECTION"
      | "ALREADY_VOTED"
      | "CLOSED"
      | "BUSY"
  ) {
    super(message);
    this.name = "VoteStoreError";
    this.code = code;
  }
}

function voteDataDirectory() {
  const configured = process.env.VOTE_DATA_DIR?.trim();
  if (configured) {
    if (!path.isAbsolute(configured)) {
      throw new Error("VOTE_DATA_DIR 必须使用绝对路径。");
    }
    return configured;
  }
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "data",
    "topic"
  );
}

function topicFile(topicId: number) {
  return path.join(voteDataDirectory(), `${topicId}.json`);
}

function validateTopicId(topicId: number) {
  if (!Number.isSafeInteger(topicId) || topicId < 1) {
    throw new VoteStoreError("投票主题 ID 无效。", "INVALID_DATA");
  }
}

function nonNegativeInteger(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0
    ? Math.trunc(number)
    : 0;
}

function parseOption(
  value: unknown,
  index: number
): StoredVoteOption | null {
  if (typeof value === "string") {
    const label = value.trim();
    return label
      ? { id: String(index + 1), label: label.slice(0, 120), count: 0 }
      : null;
  }
  if (!value || typeof value !== "object") return null;

  const option = value as Record<string, unknown>;
  const labelValue = option.label ?? option.text ?? option.name;
  if (typeof labelValue !== "string" || !labelValue.trim()) return null;

  const rawId = String(option.id ?? index + 1).trim();
  const id = /^[a-z0-9_-]{1,48}$/i.test(rawId)
    ? rawId
    : String(index + 1);

  return {
    id,
    label: labelValue.trim().slice(0, 120),
    count: nonNegativeInteger(option.count ?? option.votes)
  };
}

function normalizeStoredVotes(raw: unknown): StoredVotes {
  const source = Array.isArray(raw)
    ? { options: raw }
    : raw && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : null;

  if (!source || !Array.isArray(source.options)) {
    throw new VoteStoreError(
      "投票数据缺少有效的 options 数组。",
      "INVALID_DATA"
    );
  }

  const usedIds = new Set<string>();
  const options = source.options
    .slice(0, MAX_OPTIONS)
    .map(parseOption)
    .filter((option): option is StoredVoteOption => Boolean(option))
    .map((option, index) => {
      let id = option.id;
      if (usedIds.has(id)) id = String(index + 1);
      while (usedIds.has(id)) id = `${id}-${index + 1}`;
      usedIds.add(id);
      return { ...option, id };
    });

  if (options.length < 2) {
    throw new VoteStoreError("投票至少需要两个有效选项。", "INVALID_DATA");
  }

  const voters: Record<string, string[]> = {};
  if (
    source.voters &&
    typeof source.voters === "object" &&
    !Array.isArray(source.voters)
  ) {
    for (const [voterId, selection] of Object.entries(source.voters)) {
      const selected = (Array.isArray(selection) ? selection : [selection])
        .map(String)
        .filter((id, index, values) =>
          usedIds.has(id) && values.indexOf(id) === index
        );
      if (selected.length) voters[voterId] = selected;
    }
  }

  const multiple = source.multiple === true;
  const inferredTotal = multiple
    ? Math.max(
        Object.keys(voters).length,
        ...options.map((option) => option.count)
      )
    : options.reduce((sum, option) => sum + option.count, 0);
  const suppliedTotal = nonNegativeInteger(
    source.totalVoters ?? source.total_voters
  );

  return {
    question:
      typeof source.question === "string" && source.question.trim()
        ? source.question.trim().slice(0, 120)
        : "投票",
    multiple,
    closed: source.closed === true,
    totalVoters: Math.max(
      suppliedTotal,
      inferredTotal,
      Object.keys(voters).length
    ),
    options,
    voters,
    ownerUid:
      nonNegativeInteger(source.ownerUid ?? source.owner_uid) || undefined,
    closesAt:
      nonNegativeInteger(source.closesAt ?? source.closes_at) || undefined,
    createdAt: nonNegativeInteger(source.createdAt) || undefined,
    updatedAt: nonNegativeInteger(source.updatedAt) || undefined
  };
}

function publicPoll(
  topicId: number,
  votes: StoredVotes,
  voterId?: number
): VotePoll {
  const now = Math.floor(Date.now() / 1000);
  const deadlineReached = Boolean(votes.closesAt && now >= votes.closesAt);
  const resultsVisible =
    !votes.closesAt ||
    votes.closed ||
    deadlineReached ||
    Boolean(voterId && voterId === votes.ownerUid);

  return {
    topicId,
    question: votes.question,
    multiple: votes.multiple,
    closed: votes.closed || deadlineReached,
    closesAt: votes.closesAt ?? null,
    resultsVisible,
    totalVoters: resultsVisible ? votes.totalVoters : null,
    options: votes.options.map((option) => ({
      ...option,
      count: resultsVisible ? option.count : null
    })),
    selectedOptionIds:
      voterId && votes.voters[String(voterId)]
        ? votes.voters[String(voterId)]
        : []
  };
}

async function readTopicDocument(topicId: number) {
  validateTopicId(topicId);
  try {
    const content = await readFile(topicFile(topicId), "utf8");
    const parsed = JSON.parse(content) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new VoteStoreError(
        "主题投票数据文件必须是 JSON 对象。",
        "INVALID_DATA"
      );
    }
    return parsed as TopicDocument;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null;
    }
    if (error instanceof VoteStoreError) throw error;
    if (error instanceof SyntaxError) {
      throw new VoteStoreError(
        "主题投票数据文件不是有效的 JSON。",
        "INVALID_DATA"
      );
    }
    throw error;
  }
}

async function writeTopicDocument(
  topicId: number,
  document: TopicDocument
) {
  const directory = voteDataDirectory();
  await mkdir(directory, { recursive: true });
  const destination = topicFile(topicId);
  const temporary = path.join(
    directory,
    `.${topicId}.${process.pid}.${randomUUID()}.tmp`
  );

  await writeFile(temporary, `${JSON.stringify(document, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600
  });
  try {
    await rename(temporary, destination);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
}

async function wait(delay: number) {
  await new Promise((resolve) => setTimeout(resolve, delay));
}

async function withTopicLock<T>(
  topicId: number,
  operation: () => Promise<T>
) {
  validateTopicId(topicId);
  const directory = voteDataDirectory();
  await mkdir(directory, { recursive: true });
  const lockPath = path.join(directory, `.${topicId}.vote.lock`);
  let handle: Awaited<ReturnType<typeof open>> | null = null;

  for (let attempt = 0; attempt < LOCK_RETRY_COUNT; attempt += 1) {
    try {
      handle = await open(lockPath, "wx", 0o600);
      break;
    } catch (error) {
      if (
        !error ||
        typeof error !== "object" ||
        !("code" in error) ||
        error.code !== "EEXIST"
      ) {
        throw error;
      }

      try {
        const lockStat = await stat(lockPath);
        if (Date.now() - lockStat.mtimeMs > STALE_LOCK_MS) {
          await unlink(lockPath);
          continue;
        }
      } catch {
        continue;
      }
      await wait(LOCK_RETRY_DELAY_MS);
    }
  }

  if (!handle) {
    throw new VoteStoreError("投票正在处理中，请稍后重试。", "BUSY");
  }

  try {
    return await operation();
  } finally {
    await handle.close().catch(() => undefined);
    await unlink(lockPath).catch(() => undefined);
  }
}

function contentWithoutMarkdownCode(content: string) {
  return content
    .replace(/<(pre|code)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(
      /(^|\n)(```|~~~)[^\n]*\n[\s\S]*?(?:\n\2(?=\n|$)|$)/g,
      ""
    )
    .replace(/`[^`\n]*`/g, "");
}

function decodeVoteText(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " "
  };

  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|blockquote)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(
      /&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi,
      (entity, decimal, hexadecimal, name: string | undefined) => {
        if (decimal || hexadecimal) {
          const codePoint = decimal
            ? Number(decimal)
            : Number.parseInt(hexadecimal, 16);
          return Number.isSafeInteger(codePoint) && codePoint <= 0x10ffff
            ? String.fromCodePoint(codePoint)
            : entity;
        }
        return name ? (named[name.toLowerCase()] ?? entity) : entity;
      }
    );
}

function parseVoteDeadline(value: string | undefined) {
  if (!value) return undefined;
  const normalized = value.trim();
  const local = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/
  );
  let milliseconds: number;

  if (local) {
    const [, year, month, day, hour, minute] = local.map(Number);
    milliseconds = Date.UTC(year, month - 1, day, hour - 8, minute);
    const shanghai = new Date(milliseconds + 8 * 60 * 60 * 1000);
    if (
      shanghai.getUTCFullYear() !== year ||
      shanghai.getUTCMonth() !== month - 1 ||
      shanghai.getUTCDate() !== day ||
      shanghai.getUTCHours() !== hour ||
      shanghai.getUTCMinutes() !== minute
    ) {
      throw new VoteStoreError("投票截止时间无效。", "INVALID_DATA");
    }
  } else {
    milliseconds = Date.parse(normalized);
  }

  if (!Number.isFinite(milliseconds)) {
    throw new VoteStoreError(
      "投票截止时间格式应为 YYYY-MM-DD HH:mm。",
      "INVALID_DATA"
    );
  }
  return Math.floor(milliseconds / 1000);
}

export function parseVoteUbb(content: string): VoteDraft | null {
  const searchable = contentWithoutMarkdownCode(content)
    .replace(/(?:&#0*91;|&#x0*5b;|&lbrack;)/gi, "[")
    .replace(/(?:&#0*93;|&#x0*5d;|&rbrack;)/gi, "]");
  const matches = Array.from(
    searchable.matchAll(
      /\[vote(?:\s+until\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\]\s]+)))?\s*\]([\s\S]*?)\[\/vote\]/gi
    )
  );

  if (!matches.length) {
    if (/\[\/?vote(?:\s[^\]]*)?\]/i.test(searchable)) {
      throw new VoteStoreError("投票 UBB 标签没有完整闭合。", "INVALID_DATA");
    }
    return null;
  }
  if (matches.length > 1) {
    throw new VoteStoreError("每个主题只能包含一个投票。", "INVALID_DATA");
  }

  const lines = decodeVoteText(matches[0][4])
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const question = lines[0] ?? "";
  const options = lines.slice(1);

  if (!question || question.length > 120) {
    throw new VoteStoreError(
      "vote 标签内第一行必须是 1–120 字的投票标题。",
      "INVALID_DATA"
    );
  }
  if (options.length < 2 || options.length > MAX_OPTIONS) {
    throw new VoteStoreError(
      `投票需要 2–${MAX_OPTIONS} 个选项。`,
      "INVALID_DATA"
    );
  }
  if (options.some((option) => option.length > 120)) {
    throw new VoteStoreError("每个投票选项不能超过 120 字。", "INVALID_DATA");
  }
  if (
    new Set(options.map((option) => option.toLocaleLowerCase("zh-CN"))).size !==
    options.length
  ) {
    throw new VoteStoreError("投票选项不能重复。", "INVALID_DATA");
  }

  return {
    question,
    multiple: false,
    options,
    closesAt: parseVoteDeadline(
      matches[0][1] ?? matches[0][2] ?? matches[0][3]
    )
  };
}

function hasVoteResponses(votes: StoredVotes) {
  return (
    votes.totalVoters > 0 ||
    Object.keys(votes.voters).length > 0 ||
    votes.options.some((option) => option.count > 0)
  );
}

function mergeVoteDefinition(
  votes: StoredVotes,
  draft: VoteDraft,
  ownerUid?: number
) {
  const hasResponses = hasVoteResponses(votes);
  let options: StoredVoteOption[];

  if (!hasResponses) {
    options = draft.options.map((label, index) => ({
      id: String(index + 1),
      label,
      count: 0
    }));
  } else {
    if (votes.options.length !== draft.options.length) {
      throw new VoteStoreError(
        "投票已经有人参与，不能增加或删除选项。",
        "INVALID_DATA"
      );
    }

    const oldLabels = votes.options.map((option) =>
      option.label.toLocaleLowerCase("zh-CN")
    );
    const newLabels = draft.options.map((label) =>
      label.toLocaleLowerCase("zh-CN")
    );
    const sameLabels =
      [...oldLabels].sort().join("\u0000") ===
      [...newLabels].sort().join("\u0000");
    const reordered =
      sameLabels &&
      oldLabels.some((label, index) => label !== newLabels[index]);
    if (reordered) {
      throw new VoteStoreError(
        "投票已经有人参与，不能调整选项顺序。",
        "INVALID_DATA"
      );
    }

    options = votes.options.map((option, index) => ({
      ...option,
      label: draft.options[index]
    }));
  }

  return {
    ...votes,
    question: draft.question,
    options,
    ownerUid: votes.ownerUid ?? ownerUid,
    closesAt: draft.closesAt,
    updatedAt: Math.floor(Date.now() / 1000)
  };
}

export async function validateTopicVoteEdit(
  topicId: number,
  draft: VoteDraft | null
) {
  if (!draft) return;
  const document = await readTopicDocument(topicId);
  if (document?.votes === undefined) return;
  mergeVoteDefinition(normalizeStoredVotes(document.votes), draft);
}

export async function syncTopicVoteEdit(
  topicId: number,
  draft: VoteDraft | null,
  ownerUid?: number
) {
  if (!draft) return { updated: false };

  return withTopicLock(topicId, async () => {
    const document = await readTopicDocument(topicId);
    if (document?.votes === undefined) return { updated: false };
    const votes = mergeVoteDefinition(
      normalizeStoredVotes(document.votes),
      draft,
      ownerUid
    );

    await writeTopicDocument(topicId, { ...document, votes });
    return { updated: true };
  });
}

export async function getTopicVote(topicId: number, voterId?: number) {
  const document = await readTopicDocument(topicId);
  if (!document || document.votes === undefined) {
    throw new VoteStoreError("这个投票不存在。", "NOT_FOUND");
  }
  return publicPoll(
    topicId,
    normalizeStoredVotes(document.votes),
    voterId
  );
}

export function previewTopicVote(
  topicId: number,
  draft: VoteDraft,
  ownerUid?: number,
  voterId?: number
) {
  const now = Math.floor(Date.now() / 1000);
  return publicPoll(
    topicId,
    {
      question: draft.question,
      multiple: draft.multiple,
      closed: false,
      totalVoters: 0,
      options: draft.options.map((label, index) => ({
        id: String(index + 1),
        label,
        count: 0
      })),
      voters: {},
      ownerUid,
      closesAt: draft.closesAt,
      createdAt: now,
      updatedAt: now
    },
    voterId
  );
}

export async function castTopicVote(
  topicId: number,
  voterId: number,
  optionIds: string[],
  fallbackDraft?: VoteDraft,
  ownerUid?: number
) {
  return withTopicLock(topicId, async () => {
    const existingDocument = await readTopicDocument(topicId);
    if (
      existingDocument?.votes === undefined &&
      fallbackDraft === undefined
    ) {
      throw new VoteStoreError("这个投票不存在。", "NOT_FOUND");
    }

    const now = Math.floor(Date.now() / 1000);
    const votes =
      existingDocument?.votes === undefined
        ? {
            question: fallbackDraft!.question,
            multiple: fallbackDraft!.multiple,
            closed: false,
            totalVoters: 0,
            options: fallbackDraft!.options.map((label, index) => ({
              id: String(index + 1),
              label,
              count: 0
            })),
            voters: {},
            ownerUid,
            closesAt: fallbackDraft!.closesAt,
            createdAt: now,
            updatedAt: now
          }
        : normalizeStoredVotes(existingDocument.votes);
    if (
      votes.closed ||
      Boolean(
        votes.closesAt &&
          now >= votes.closesAt
      )
    ) {
      throw new VoteStoreError("这个投票已经结束。", "CLOSED");
    }

    const voterKey = String(voterId);
    if (votes.voters[voterKey]?.length) {
      throw new VoteStoreError("你已经参与过这个投票。", "ALREADY_VOTED");
    }

    const selected = optionIds
      .map(String)
      .filter((id, index, values) => values.indexOf(id) === index);
    const validIds = new Set(votes.options.map((option) => option.id));
    if (
      !selected.length ||
      selected.some((id) => !validIds.has(id)) ||
      (!votes.multiple && selected.length !== 1)
    ) {
      throw new VoteStoreError("请选择有效的投票选项。", "INVALID_SELECTION");
    }

    votes.options = votes.options.map((option) =>
      selected.includes(option.id)
        ? { ...option, count: option.count + 1 }
        : option
    );
    votes.voters[voterKey] = selected;
    votes.totalVoters += 1;
    votes.updatedAt = now;

    await writeTopicDocument(topicId, {
      ...(existingDocument ?? {}),
      votes
    });
    return publicPoll(topicId, votes, voterId);
  });
}
