import { env } from '../config/env';
import type { FileDiff, ReviewResult } from '../domain/types';
import { buildPrompt } from './prompt';

const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash';
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_TEMPERATURE = 0.2;

export async function runReview(diffs: FileDiff[]): Promise<ReviewResult> {
  const prompt = buildPrompt(diffs);

  const response = await fetch(`${GEMINI_API_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${env.geminiApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: GEMINI_TEMPERATURE,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`[reviewer] Gemini API error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as {
    candidates: { content: { parts: { text: string }[] } }[];
  };

  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error('[reviewer] Empty response from Gemini');

  let result: ReviewResult;
  try {
    result = JSON.parse(raw) as ReviewResult;
  } catch (e) {
    throw new Error(
      `[reviewer] Failed to parse Gemini response as JSON: ${e instanceof Error ? e.message : String(e)}\nRaw response: ${raw.slice(0, 200)}`,
    );
  }

  return result;
}
