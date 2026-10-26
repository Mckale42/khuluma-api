/**
 * Google Gemini wrapper (design doc §2.2 AI layer, FR-8).
 * The API key lives ONLY on the server; the Android app never sees it. Each
 * function builds a task-specific prompt and returns plain text / JSON. If no
 * key is configured the functions throw, so the route can return a clean 503.
 */
import fetch from 'node-fetch';
import { env } from '../config/env';
import { HttpError } from '../utils/httpError';

async function generate(prompt: string): Promise<string> {
  if (!env.geminiApiKey) throw new HttpError(503, 'AI is not configured (GEMINI_API_KEY missing).');

  // Auto-upgrade if configured model is the retired gemini-1.5-flash
  const primaryModel = (!env.geminiModel || env.geminiModel === 'gemini-1.5-flash')
    ? 'gemini-flash-latest'
    : env.geminiModel;

  const candidateModels = [primaryModel, 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'].filter(
    (m, i, arr) => arr.indexOf(m) === i
  );

  let lastError = '';
  let lastStatus = 502;

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.geminiApiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[Gemini] Request to ${model} failed (${res.status}): ${errText}`);
        lastStatus = res.status;
        lastError = errText;
        // If 404 (model not found / deprecated) or 400, try next candidate model
        if (res.status === 404 || res.status === 400) {
          continue;
        }
        break;
      }

      const data: any = await res.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const textParts = parts.filter((p: any) => p.text && !p.thought);
      const text = textParts.length > 0
        ? textParts.map((p: any) => p.text).join('\n')
        : parts.map((p: any) => p.text || '').join('\n');

      return text.trim();
    } catch (err: any) {
      console.error(`[Gemini] Error contacting ${model}:`, err);
      lastError = err.message || String(err);
    }
  }

  throw new HttpError(502, `Gemini request failed (${lastStatus}): ${lastError}`);
}

/** AI Buddy conversation tutor, pitched at the learner's level. */
export async function aiChat(message: string, level: number, lang = 'isiZulu'): Promise<string> {
  const prompt =
    `You are "Buddy", a friendly ${lang} language tutor for a South African learning app.` +
    ` The learner is at level ${level} (beginner-friendly). Keep replies short, encouraging,` +
    ` and include the ${lang} phrase plus its English meaning where useful.\n\nLearner: ${message}`;
  return generate(prompt);
}

/** Plain-English reason WHY an answer was wrong (mistake coach). */
export async function aiExplain(prompt: string, userAnswer: string, correctAnswer: string): Promise<string> {
  const p =
    `A learner answered an isiZulu exercise incorrectly. In 2-3 short sentences, kindly explain WHY` +
    ` their answer is wrong and what the correct idea is. Avoid jargon.\n\n` +
    `Exercise: ${prompt}\nLearner answered: ${userAnswer}\nCorrect answer: ${correctAnswer}`;
  return generate(p);
}

/** Grade a typed translation on MEANING, not spelling. Returns {correct, feedback}. */
export async function aiCheckAnswer(
  prompt: string,
  expected: string,
  userAnswer: string
): Promise<{ correct: boolean; feedback: string }> {
  const p =
    `You grade an isiZulu translation exercise on MEANING, not exact spelling. Reply with STRICT JSON` +
    ` {"correct": boolean, "feedback": string}. Be lenient on minor typos/accents.\n\n` +
    `Prompt: ${prompt}\nExpected meaning: ${expected}\nLearner wrote: ${userAnswer}`;
  const raw = await generate(p);
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : raw;
    const json = JSON.parse(jsonStr);
    return { correct: !!json.correct, feedback: String(json.feedback || '') };
  } catch {
    // Fallback: simple normalised comparison if the model didn't return JSON.
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    return { correct: norm(expected) === norm(userAnswer), feedback: raw };
  }
}
