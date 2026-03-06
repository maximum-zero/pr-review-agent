# pr-review-agent

## Goal

GitHub Pull Request diff 기반 AI 코드 리뷰 자동화 도구를 만든다.

## MVP Scope

- GitHub Actions로 PR 이벤트 감지
- PR changed files / diff 수집
- AI 기반 구조화 리뷰 생성
- PR summary comment 1개 upsert
- High/Med finding 최대 3개 line comment 생성

## Out of Scope

- 멀티레포 배포
- reusable workflow
- 자동 이슈 생성
- 복잡한 context enrichment
- 모델 다중 provider 지원

## Tech Stack

- TypeScript
- GitHub Actions
- Octokit

## Working Style

- 답변은 한국어로 한다.
- 먼저 계획을 짧게 제시한 뒤 구현한다.
- 변경은 작은 단위로 나눈다.
- 불확실하면 추측하지 말고 확인 필요로 표시한다.
