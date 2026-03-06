const REQUIRED_VARS = ['GITHUB_TOKEN', 'GITHUB_REPOSITORY', 'PR_NUMBER', 'GEMINI_API_KEY'] as const

const missing = REQUIRED_VARS.filter((key) => !process.env[key])
if (missing.length > 0) {
  console.error(`[env] Missing required environment variables: ${missing.join(', ')}`)
  process.exit(1)
}

const [owner, repo] = process.env.GITHUB_REPOSITORY!.split('/')
if (!owner || !repo) {
  console.error(`[env] Invalid GITHUB_REPOSITORY format: ${process.env.GITHUB_REPOSITORY}`)
  process.exit(1)
}

const prNumber = Number.parseInt(process.env.PR_NUMBER!, 10)
if (Number.isNaN(prNumber)) {
  console.error(`[env] PR_NUMBER must be a valid number: ${process.env.PR_NUMBER}`)
  process.exit(1)
}

export const env = {
  githubToken: process.env.GITHUB_TOKEN!,
  owner,
  repo,
  prNumber,
  geminiApiKey: process.env.GEMINI_API_KEY!,
} as const
