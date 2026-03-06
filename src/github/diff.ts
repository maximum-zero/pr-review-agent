import { env } from '../config/env';
import { octokit } from './client';
import type { FileDiff } from '../domain/types';

const PER_PAGE = 100;

export async function getPrDiffs(): Promise<FileDiff[]> {
  const { data: files } = await octokit.pulls.listFiles({
    owner: env.owner,
    repo: env.repo,
    pull_number: env.prNumber,
    per_page: PER_PAGE,
  });

  return files
    .filter((f) => f.patch !== undefined)

    .map((f) => ({
      filename: f.filename,
      patch: f.patch!,
      additions: f.additions,
      deletions: f.deletions,
    }));
}
