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
