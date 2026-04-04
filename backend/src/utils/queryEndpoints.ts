import systemPromptTxt from "../prompts/system";
import intentPromptTxt from "../prompts/intent-extractor";
import { GoogleGenerativeAI } from "@google/generative-ai";
import queryClassifier from "../prompts/query-classifier";

export async function classifyQuery(query: string) {
  const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const result = model.getGenerativeModel({ model: "gemini-2.5-flash" });
  const prompt = `
${queryClassifier}
User Query:
${query}
`;
  const response = await result.generateContent(prompt);
  return JSON.parse(response.response.text());
}

export async function extractIntent(query: string) {
  const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const result = model.getGenerativeModel({ model: "gemini-2.5-flash" });
  const prompt = `
${intentPromptTxt}
User Query:
${query}
`;
  const response = await result.generateContent(prompt);
  return JSON.parse(response.response.text());
}

export function scoreEndpoint(query: string, e: any) {
  query = query.toLowerCase();

  let score = 0;

  if (e.searchText.includes(query)) score += 5;

  // word-level match
  const words = query.split(" ");
  for (const w of words) {
    if (e.searchText.includes(w)) score += 1;
  }

  if (query.includes(e.intent)) score += 3;
  if (query.includes(e.resource)) score += 3;

  return score;
}

export function findRelevantEndpoints(query: string, endpoints: any[]) {
  return endpoints
    .map((e) => ({ ...e, score: scoreEndpoint(query, e) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

export function buildPrompt(query: string) {
  return `
  User query:
  ${query}
  `;
}

export function systemPrompt() {
  return systemPromptTxt;
}
