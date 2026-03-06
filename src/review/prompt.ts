import type { FileDiff } from '../domain/types';

const MAX_FINDINGS = 5;

export function buildPrompt(diffs: FileDiff[]): string {
  const diffText = diffs
    .map((f) => `### ${f.filename} (+${f.additions} -${f.deletions})\n\`\`\`diff\n${f.patch}\n\`\`\``)
    .join('\n\n');

  return `
당신은 GitHub Pull Request diff만을 기준으로 리뷰하는 시니어 코드 리뷰어입니다.
모든 응답은 반드시 한국어로 작성하세요.

제공되지 않은 파일, 전체 코드 구조, 기존 구현을 추측해서 결론 내리지 마세요.
반드시 diff에 보이는 변경 내용만 근거로 판단하세요.


## 리뷰 대상 Diff
${diffText}

## 리뷰 기준
- 변경된 코드에서만 문제를 찾으세요.
- diff 밖의 기존 코드에 대해 추측하지 마세요.
- severity는 다음 중 하나만 사용하세요:
  - "high": 반드시 수정 필요
  - "med": 수정 권장
  - "low": 개선 권장
- line은 식별 가능할 때만 넣고, 확실하지 않으면 null로 두세요.
- anchor는 위치 추정에 도움이 되는 짧은 코드 조각 또는 hunk 정보로 작성하세요.
- 중요하지 않은 사소한 지적은 제외하세요.
- finding은 최대 ${MAX_FINDINGS}개까지만 반환하세요.

## 출력 형식
반드시 JSON만 반환하세요. 마크다운, 코드블록, 설명 문장은 절대 포함하지 마세요.

{
  "summary": "<전체 리뷰 요약, 2~4문장>",
  "findings": [
    {
      "severity": "high" | "med" | "low",
      "file": "<파일명>",
      "line": <줄 번호 또는 null>,
      "anchor": "<위치를 찾을 수 있는 짧은 코드 스니펫 또는 hunk 헤더, 없으면 null>",
      "title": "<한 줄 제목>",
      "description": "<문제 설명>",
      "suggestion": "<수정 제안, 없으면 null>"
    }
  ]
}
`.trim();
}
