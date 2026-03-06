import { env } from '../config/env';
import { octokit } from './client';
import type { FileDiff } from '../domain/types';

const PER_PAGE = 100;
const MAX_PATCH_LINES = 1000;
const MAX_TOTAL_LINES = 10000;

const EXCLUDE_PATTERNS = [
  /^package-lock\.json$/,
  /^yarn\.lock$/,
  /^pnpm-lock\.yaml$/,
  /^bun\.lockb$/,
  /\.generated\.(ts|js|graphql)$/,
  /\/__generated__\//,
  /(^|\/)dist\//,
  /(^|\/)build\//,
  /(^|\/)\.(next)\//,
  /\.snap$/,
];

function isExcluded(filename: string): boolean {
  return EXCLUDE_PATTERNS.some((pattern) => pattern.test(filename));
}

function truncatePatch(patch: string): string {
  const lines = patch.split('\n');
  if (lines.length <= MAX_PATCH_LINES) return patch;
  return lines.slice(0, MAX_PATCH_LINES).join('\n') + '\n// (이하 생략: 파일이 너무 큼)';
}

export async function getPrDiffs(): Promise<FileDiff[]> {
  const { data: files } = await octokit.pulls.listFiles({
    owner: env.owner,
    repo: env.repo,
    pull_number: env.prNumber,
    per_page: PER_PAGE,
  });

  const diffs: FileDiff[] = [];
  let totalLines = 0;

  for (const f of files) {
    if (!f.patch || isExcluded(f.filename)) continue;

    const patch = truncatePatch(f.patch);
    const lineCount = patch.split('\n').length;

    if (totalLines + lineCount > MAX_TOTAL_LINES) continue;
    totalLines += lineCount;

    diffs.push({
      filename: f.filename,
      patch,
      additions: f.additions,
      deletions: f.deletions,
    });
  }

  return diffs;
}
