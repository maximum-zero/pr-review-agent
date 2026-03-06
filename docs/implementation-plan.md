# PR Review Agent - Implementation Plan

## Goal

GitHub Pull Request diff 기반 AI 코드 리뷰 자동화 도구를 구현한다.
PR이 열리거나 업데이트되면 GitHub Actions가 트리거되어 AI 리뷰를 생성하고 PR에 코멘트를 게시한다.

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

---

## Tech Stack & 결정 사항

| 항목              | 선택                 | 이유                                            |
| ----------------- | -------------------- | ----------------------------------------------- |
| 언어              | TypeScript           | 타입 안정성                                     |
| 런타임            | Node.js 20           | fetch 내장, GitHub Actions 기본 지원            |
| 모델 호출         | Node fetch 직접 호출 | 외부 AI SDK 의존 없이 단순하게 유지             |
| GitHub API        | @octokit/rest        | @actions/core 없이 process.env 기반으로 단순화  |
| line comment 위치 | anchor 기반 추정     | 실패 시 line comment 생략 (summary는 항상 게시) |

---

## Label Strategy

PR Review Agent는 최소한의 라벨 전략을 사용한다.

### 기본 개발 라벨 (Repository 운영)

- ✨ feature
- 🐛 bug
- ♻️ refactor
- 📝 docs
- 🧪 test
- 🔧 chore

이 라벨들은 일반적인 PR/Issue 분류용이며, AI 리뷰와 직접적인 연관은 없다.

### AI 리뷰 라벨

- 🤖 ai-review

AI 리뷰가 실행된 PR에 추가되는 라벨이다.

MVP 단계에서는 severity 기반 라벨(high/med/low)은 사용하지 않는다.

PR 상태에 따라 라벨을 동적으로 변경하는 기능은 이후 단계에서 고려한다.

---

## 디렉토리 구조

```
pr-review-agent/
├── CLAUDE.md
├── package.json
├── tsconfig.json
├── eslint.config.mjs
├── .prettierrc
├── .gitignore
├── docs/
│   └── implementation-plan.md
├── .github/
│   ├── labels.json
│   └── workflows/
│       ├── pr-review.yml
│       └── labels.yml
└── src/
    ├── index.ts                  # 엔트리포인트 & 파이프라인 오케스트레이션
    ├── config/
    │   └── env.ts                # process.env 파싱 및 검증
    ├── domain/
    │   └── types.ts              # 공유 타입 정의
    ├── github/
    │   ├── client.ts             # Octokit 인스턴스
    │   ├── diff.ts               # PR diff 수집
    │   └── comment.ts            # summary upsert / line comment 생성
    └── review/
        ├── prompt.ts             # 프롬프트 템플릿
        ├── reviewer.ts           # AI 호출 → ReviewResult 파싱
        └── formatter.ts          # ReviewResult → 마크다운 변환
```

---

## 타입 정의 (domain/types.ts)

```ts
export interface FileDiff {
  filename: string;
  patch: string;
  additions: number;
  deletions: number;
}

export type Severity = 'high' | 'med' | 'low';

export interface ReviewFinding {
  severity: Severity;
  file: string;
  line?: number;
  anchor?: string;
  title: string;
  description: string;
  suggestion?: string;
}

export interface ReviewResult {
  summary: string;
  findings: ReviewFinding[];
}
```

---

## 단계별 구현 계획

### Step 1 — 프로젝트 골격 & 도구 세팅 ✅

**포함 파일:** package.json, tsconfig.json, eslint.config.mjs, .prettierrc, .gitignore, 빈 src 구조

**완료 조건:**

- `npm run build` 통과
- `npm run lint` 통과
- `npm run format:check` 통과

---

### Step 2 — GitHub 라벨 세팅

**포함 파일:** .github/labels.json, .github/workflows/labels.yml

**작업 내용:**

- `labels.json`에 repository 기본 라벨 정의
- 기본 라벨
  - ✨ feature
  - 🐛 bug
  - ♻️ refactor
  - 📝 docs
  - 🧪 test
  - 🔧 chore
  - 🤖 ai-review
- `labels.yml` workflow가 labels.json 기준으로 repository 라벨을 동기화

**완료 조건:**

- `labels.json` push 시 GitHub Actions가 실행되고 repository 라벨이 정의된 상태와 동일하게 동기화된다.

---

### Step 3 — 타입 및 환경변수 정의

**포함 파일:** src/domain/types.ts, src/config/env.ts

**작업 내용:**

- `types.ts`: FileDiff, ReviewFinding (line, anchor, suggestion은 optional), ReviewResult
- `env.ts`: GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER, GEMINI_API_KEY 등 필수 환경변수 파싱, 누락 시 process.exit(1)

**완료 조건:**

- 모든 타입 컴파일 통과
- 환경변수 누락 시 명확한 에러 메시지 출력

---

### Step 4 — GitHub 클라이언트 (diff 수집)

**포함 파일:** src/github/client.ts, src/github/diff.ts

**작업 내용:**

- `client.ts`: GITHUB_TOKEN으로 Octokit 인스턴스 생성
- `diff.ts`: PR의 changed files + patch 수집 → FileDiff[] 반환

**완료 조건:**

- 실제 PR 번호 입력 시 FileDiff[] 정상 반환

---

### Step 5 — AI 리뷰어

**포함 파일:** src/review/prompt.ts, src/review/reviewer.ts

**작업 내용:**

- `prompt.ts`: FileDiff[] → 프롬프트 문자열 생성
- `reviewer.ts`: Node fetch로 AI API 호출 → JSON 파싱 → ReviewResult 반환

**완료 조건:**

- diff 입력 → ReviewResult JSON 반환
- finding 각각에 severity, file, title, description 포함 (line, anchor, suggestion은 optional)

---

### Step 6 — Summary Comment 게시

**포함 파일:** src/review/formatter.ts, src/github/comment.ts (summary 부분)

**작업 내용:**

- `formatter.ts`: ReviewResult → summary 마크다운 변환
- `comment.ts`: 기존 봇 코멘트 탐색 → 있으면 edit, 없으면 create (upsert)

**완료 조건:**

- PR에 summary comment 1개 upsert
- 재실행 시 기존 코멘트 덮어쓰기

---

### Step 7 — Line Comment 게시

**포함 파일:** src/github/comment.ts (line comment 부분 추가)

**작업 내용:**

- High/Med finding 최대 3개 필터링
- finding의 anchor 필드로 diff hunk 내 위치 추정
- 위치 추정 성공 시 line comment 게시, 실패 시 해당 finding 생략

**완료 조건:**

- High/Med finding 최대 3개 line comment PR에 게시
- anchor 위치 추정 실패 시 조용히 생략 (에러 없음)

---

### Step 8 — 엔트리포인트 & Actions 워크플로우

**포함 파일:** src/index.ts, .github/workflows/pr-review.yml

**작업 내용:**

- `index.ts`: Step 4 → 5 → 6 → 7 순서 파이프라인 연결
- `pr-review.yml`: pull_request (opened, synchronize) 트리거, GEMINI_API_KEY secret 주입

**완료 조건:**

- 실제 PR 오픈 시 Actions 전체 파이프라인 end-to-end 실행 성공
- PR에 summary comment + line comment 게시 확인

---

## Phase 1 — 안정성 개선 (MVP 이후)

MVP가 동작하는 것을 확인한 뒤, 실사용에서 발생하는 노이즈와 오류를 줄인다.

### Step 9 — Draft PR 스킵

**작업 내용:**

- PR 오픈 시 `pr.draft === true`이면 리뷰 없이 종료
- 또는 workflow 레벨에서 `if: github.event.pull_request.draft == false` 조건 추가

**완료 조건:**

- Draft PR에서 Actions가 실행되지 않거나 조기 종료

---

### Step 10 — 제외 파일 패턴 처리

**작업 내용:**

- lock 파일, 자동생성 파일 등 기본 제외 패턴 하드코딩
  - `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lockb`
  - `**/*.generated.ts`, `**/__generated__/**`
  - `dist/**`, `build/**`, `.next/**`
  - `**/*.snap`
- `diff.ts`에서 FileDiff[] 수집 후 해당 패턴 필터링

**완료 조건:**

- 제외 파일이 AI 프롬프트에 포함되지 않음

---

### Step 11 — Diff 크기 제한 (토큰 초과 방지)

**작업 내용:**

- 파일당 patch 최대 라인 수 제한 (예: 300줄 초과 시 truncation + 안내 메시지)
- 전체 diff 합산 크기 제한

**완료 조건:**

- 대형 PR에서 API 오류 없이 리뷰 생성

---

## Phase 2 — GitHub Composite Action 패키징 (멀티레포 지원)

다른 레포에서 `uses: {owner}/pr-review-agent@main`으로 바로 사용할 수 있도록 패키징한다.

### Step 12 — 프로젝트별 리뷰 지시 파일 지원

**작업 내용:**

- 타겟 레포의 `.github/pr-review.md`를 읽어 프롬프트에 주입
- 파일 없으면 기본 리뷰만 동작 (하위 호환)
- `.github/pr-review.md.example` 템플릿 제공

**템플릿 구조:**

```markdown
## 프로젝트 개요

## 아키텍처

## 테스트 규칙

## 팀 컨벤션

## 제외 파일 패턴
```

**완료 조건:**

- `.github/pr-review.md` 있을 때 해당 규칙 기반 리뷰 생성 확인
- 없을 때 기본 동작 확인

---

### Step 13 — ncc 번들링 & action.yml 작성

**작업 내용:**

- `@vercel/ncc`로 TypeScript → `dist/index.js` 단일 파일 번들링
- `dist/` git에 포함 (타겟 레포가 별도 빌드 없이 사용 가능)
- `action.yml` 작성: `gemini-api-key`, `github-token` inputs 정의

**타겟 레포 사용 예시:**

```yaml
- uses: {owner}/pr-review-agent@main
  with:
    gemini-api-key: ${{ secrets.GEMINI_API_KEY }}
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

**완료 조건:**

- 외부 레포에서 `uses:` 방식으로 AI 리뷰 정상 동작
