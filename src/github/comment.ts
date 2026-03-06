import { env } from '../config/env';
import { octokit } from './client';
import { REVIEW_COMMENT_MARKER } from '../review/formatter';

const PER_PAGE = 100;

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
