import { getPrDiffs } from './github/diff';
import { postLineComments, upsertSummaryComment } from './github/comment';
import { runReview } from './review/reviewer';
import { formatSummaryComment } from './review/formatter';

async function main(): Promise<void> {
  console.log('[index] PR 리뷰 시작');

  const diffs = await getPrDiffs();
  if (diffs.length === 0) {
    console.log('[index] 변경된 파일 없음, 종료');
    return;
  }

  const result = await runReview(diffs);
  await upsertSummaryComment(formatSummaryComment(result));
  await postLineComments(diffs, result);

  console.log(`[index] PR 리뷰 완료 (files=${diffs.length}, findings=${result.findings.length})`);
}

main().catch((err) => {
  console.error('[index] 리뷰 오류 발생:', err);
  process.exit(1);
});
