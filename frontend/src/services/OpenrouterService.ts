
import { User, FinancialProfile, UserTypeLabels, RiskToleranceLabels } from '../types';

// ✅ Safe way to store key in React Native / Expo
// Add EXPO_PUBLIC_OPENROUTER_API_KEY=your_key to your .env file
const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY ?? '';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'meta-llama/llama-3.1-8b-instruct:free';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

function buildSystemPrompt(user: User | null, profile: FinancialProfile | null): string {
  const lines: string[] = [
    'You are Fin, an expert AI financial advisor specialised in Indian personal finance.',
    'You give concise, actionable, and empathetic advice in plain English.',
    'Always consider Indian tax laws, government schemes (PM-JDY, PMAY, NPS, PMKISAN, etc.), and rupee-denominated context.',
    'Never recommend specific stocks or crypto for investment.',
    'Keep answers under 200 words unless the user explicitly asks for a detailed explanation.',
    'Never use markdown tables, never use | characters, never use <br> tags.',
    'Use plain text with simple numbered lists using - only.',
    '',
    '## User Profile',
  ];
  if (user) {
    lines.push(`- Name: ${user.fullName || 'User'}`);
    lines.push(`- Profile type: ${UserTypeLabels[user.userType] ?? user.userType}`);
    lines.push(`- Monthly income: ₹${(user.monthlyIncome ?? 0).toLocaleString('en-IN')}`);
    lines.push(`- Risk tolerance: ${RiskToleranceLabels[user.riskTolerance] ?? user.riskTolerance}`);
  }
  if (profile) {
    lines.push(`- Monthly expenses: ₹${profile.monthlyExpenses.toLocaleString('en-IN')}`);
    lines.push(`- Total savings: ₹${profile.totalSavings.toLocaleString('en-IN')}`);
    lines.push(`- Existing loan EMI: ₹${profile.existingLoans.toLocaleString('en-IN')}`);
    lines.push(`- Investment experience (1-10): ${profile.investmentExperience}`);
    if (profile.financialGoals?.length) {
      lines.push(`- Financial goals: ${profile.financialGoals.join(', ')}`);
    }
  }
  if (!user && !profile) lines.push('- No profile data available yet.');
  lines.push('');
  lines.push('Use the above profile to personalise every response.');
  return lines.join('\n');
}

async function callAPI(messages: any[]): Promise<Response> {
  const body = JSON.stringify({ model: MODEL, messages, max_tokens: 512, temperature: 0.7 });
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'HTTP-Referer': 'https://finstability.app',
    'X-Title': 'Finstability',
  };
  let res = await fetch(OPENROUTER_URL, { method: 'POST', headers, body });
  if (res.status === 429 || res.status === 503) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    res = await fetch(OPENROUTER_URL, { method: 'POST', headers, body });
  }
  return res;
}

export async function sendMessage(
  userMessage: string,
  history: ChatMessage[],
  user: User | null,
  profile: FinancialProfile | null,
): Promise<string> {
  if (!OPENROUTER_API_KEY) return '⚠️ API key not set. Add EXPO_PUBLIC_OPENROUTER_API_KEY to your .env file.';
  const systemPrompt = buildSystemPrompt(user, profile);
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10).map((m) => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text })),
    { role: 'user', content: userMessage },
  ];
  const res = await callAPI(messages);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return (data?.choices?.[0]?.message?.content ?? "Sorry, couldn't generate a response.").trim();
}

export function getSuggestedPrompts(user: User | null): string[] {
  const base = [
    'How can I improve my financial health score?',
    'Which government scheme am I eligible for?',
    'How should I start investing with my income?',
    'What is the 50-30-20 budgeting rule?',
  ];
  if (!user) return base;
  const extra: string[] = [];
  if (user.userType === 'STUDENT') extra.push('What education loans should I consider?');
  if (user.userType === 'SMALL_BUSINESS_OWNER') extra.push('How can I get a MUDRA loan?');
  if (user.userType === 'RETIREE') extra.push('How should I manage my retirement corpus?');
  if (user.riskTolerance === 'LOW') extra.push('What are the safest investment options in India?');
  if (user.riskTolerance === 'HIGH') extra.push('How do I start investing in mutual funds via SIP?');
  return [...extra, ...base].slice(0, 5);
}
