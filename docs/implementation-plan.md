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
  filename: string
  patch: string
  additions: number
  deletions: number
}

export type Severity = 'high' | 'med' | 'low'

export interface ReviewFinding {
  severity: Severity
  file: string
  line?: number
  anchor?: string
  title: string
  description: string
  suggestion?: string
}

export interface ReviewResult {
  summary: string
  findings: ReviewFinding[]
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
