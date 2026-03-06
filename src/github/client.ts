import { Octokit } from '@octokit/rest';
import { env } from '../config/env';

export const octokit = new Octokit({
  auth: env.githubToken,
});
