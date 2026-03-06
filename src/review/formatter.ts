import type { ReviewFinding, ReviewResult, Severity } from '../domain/types';

const SEVERITY_LABEL: Record<Severity, string> = {
  high: '🔴 High',
  med: '🟡 Med',
  low: '🔵 Low',
};

export const REVIEW_COMMENT_MARKER = '<!-- pr-review-agent -->';

export function formatSummaryComment(result: ReviewResult): string {
  const lines: string[] = [REVIEW_COMMENT_MARKER, '## 🤖 AI 코드 리뷰', '', result.summary];

  if (result.findings.length > 0) {
    lines.push('', '### 주요 발견 사항');

    for (const f of result.findings) {
      const location = f.line ? ` (${f.file}:${f.line})` : ` (${f.file})`;
      lines.push('', `**${SEVERITY_LABEL[f.severity]} — ${f.title}**${location}`);
      lines.push(f.description);
      if (f.suggestion) {
        lines.push('', `> 💡 ${f.suggestion}`);
      }
    }
  } else {
    lines.push('', '_발견된 이슈 없음_');
  }

  return lines.join('\n');
}

export function formatLineComment(finding: ReviewFinding): string {
  const lines = [REVIEW_COMMENT_MARKER, `**${SEVERITY_LABEL[finding.severity]} — ${finding.title}**`, '', finding.description];
  if (finding.suggestion) {
    lines.push('', `> 💡 ${finding.suggestion}`);
  }

  return lines.join('\n');
}
