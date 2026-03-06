import { env } from '../config/env';
import type { FileDiff, ReviewResult } from '../domain/types';
import { octokit } from './client';
import { REVIEW_COMMENT_MARKER, formatLineComment } from '../review/formatter';

const MAX_LINE_COMMENTS = 3;
const PER_PAGE = 100;

function findLineInPatch(patch: string, anchor: string): number | null {
  let currentLine = 0;
  for (const line of patch.split('\n')) {
    const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      currentLine = parseInt(hunkMatch[1], 10) - 1;
      continue;
    }
    if (!line.startsWith('-')) currentLine++;
    if ((line.startsWith('+') || line.startsWith(' ')) && line.slice(1).includes(anchor)) {
      return currentLine;
    }
  }
  return null;
}

export async function postLineComments(diffs: FileDiff[], result: ReviewResult): Promise<void> {
  const { data: pr } = await octokit.pulls.get({
    owner: env.owner,
    repo: env.repo,
    pull_number: env.prNumber,
  });
  const commitId = pr.head.sha;

  const candidates = result.findings
    .filter((f) => f.severity === 'high' || f.severity === 'med')
    .slice(0, MAX_LINE_COMMENTS);

  for (const finding of candidates) {
    const diff = diffs.find((d) => d.filename === finding.file);
    if (!diff) continue;

    const line = finding.line ?? (finding.anchor ? findLineInPatch(diff.patch, finding.anchor) : null);
    if (!line) continue;

    try {
      await octokit.pulls.createReviewComment({
        owner: env.owner,
        repo: env.repo,
        pull_number: env.prNumber,
        commit_id: commitId,
        path: finding.file,
        line,
        side: 'RIGHT',
        body: formatLineComment(finding),
      });
    } catch {
      // 위치 특정 실패 시 해당 finding 생략
    }
  }
}

export async function upsertSummaryComment(body: string): Promise<void> {
  const { data: comments } = await octokit.issues.listComments({
    owner: env.owner,
    repo: env.repo,
    issue_number: env.prNumber,
    per_page: PER_PAGE,
  });

  const existing = comments.find((c) => c.body?.includes(REVIEW_COMMENT_MARKER));

  if (existing) {
    await octokit.issues.updateComment({
      owner: env.owner,
      repo: env.repo,
      comment_id: existing.id,
      body,
    });
  } else {
    await octokit.issues.createComment({
      owner: env.owner,
      repo: env.repo,
      issue_number: env.prNumber,
      body,
    });
  }
}
