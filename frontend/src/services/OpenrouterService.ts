
import { User, FinancialProfile, UserTypeLabels, RiskToleranceLabels } from '../types';
import { AppLanguage } from '../i18n/translations';

// ✅ Safe way to store key in React Native / Expo
// Add EXPO_PUBLIC_OPENROUTER_API_KEY=your_key to your .env file
const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY ?? '';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const CANDIDATE_MODELS = [
  'qwen/qwen3.6-plus:free',
  'arcee-ai/trinity-large-preview:free',
  'stepfun/step-3.5-flash:free',
  'minimax/minimax-m2.5:free',
  'openrouter/free',
];

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

function buildSystemPrompt(user: User | null, profile: FinancialProfile | null, language: AppLanguage): string {
  const lines: string[] = [
    'You are Fin, a money guide for people in India.',
    language === 'ta' ? 'Respond in simple Tamil using Tamil script.' : 'Use very simple English.',
    language === 'ta' ? 'Use short Tamil sentences.' : 'Use short sentences.',
    'Keep answers under 120 words unless user asks for details.',
    language === 'ta' ? 'Start with one line: சுருக்கமாக: ...' : 'Start with one line: In short: ...',
    'Give 3 to 5 clear steps with - bullets.',
    language === 'ta'
      ? 'If a finance term is hard, explain it in simple Tamil words.'
      : 'If you use a hard word, explain it in simple words right away.',
    'Focus on Indian tax rules and government schemes where useful.',
    'Do not suggest specific stocks or crypto.',
    'Do not use markdown tables, | characters, or <br> tags.',
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

function shouldTryNextModel(status: number, errorText: string): boolean {
  if (status === 404) return true;
  const lower = errorText.toLowerCase();
  return (
    lower.includes('no endpoints found')
    || lower.includes('model not found')
    || lower.includes('provider unavailable')
  );
}

async function callAPI(messages: any[]): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'HTTP-Referer': 'https://finstability.app',
    'X-Title': 'Finstability',
  };

  let lastResponse: Response | null = null;
  for (const model of CANDIDATE_MODELS) {
    const body = JSON.stringify({ model, messages, max_tokens: 512, temperature: 0.7 });
    let res = await fetch(OPENROUTER_URL, { method: 'POST', headers, body });

    if (res.status === 429 || res.status === 503) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      res = await fetch(OPENROUTER_URL, { method: 'POST', headers, body });
    }

    if (res.ok) {
      return res;
    }

    const errText = await res.clone().text();
    lastResponse = res;
    if (!shouldTryNextModel(res.status, errText)) {
      return res;
    }
  }

  if (lastResponse) {
    return lastResponse;
  }

  // Should never happen, but keep a deterministic fallback error.
  return new Response(JSON.stringify({ error: { message: 'No AI models available' } }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function sendMessage(
  userMessage: string,
  history: ChatMessage[],
  user: User | null,
  profile: FinancialProfile | null,
  language: AppLanguage = 'en',
): Promise<string> {
  if (!OPENROUTER_API_KEY) return 'AI key is missing. Add EXPO_PUBLIC_OPENROUTER_API_KEY in frontend/.env.';
  const systemPrompt = buildSystemPrompt(user, profile, language);
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

export function getSuggestedPrompts(user: User | null, language: AppLanguage = 'en'): string[] {
  const isTamil = language === 'ta';
  const base = isTamil
    ? [
      'என் நிதி நிலையை எப்படி மேம்படுத்தலாம்?',
      'எனக்கு பொருந்தும் அரசு திட்டங்கள் என்ன?',
      'என் வருமானத்தில் முதலீட்டை எப்படி தொடங்கலாம்?',
      '50-30-20 பட்ஜெட்டை எளிதாக விளக்கவும்.',
    ]
    : [
      'How can I make my money health better?',
      'Which government schemes fit me?',
      'How can I start investing with my salary?',
      'Explain the 50-30-20 budget in simple words.',
    ];
  if (!user) return base;
  const extra: string[] = [];
  if (isTamil) {
    if (user.userType === 'STUDENT') extra.push('மாணவர் கடன் வாய்ப்புகள் என்ன?');
    if (user.userType === 'SMALL_BUSINESS_OWNER') extra.push('MUDRA கடனை படிப்படியாக எப்படி பெறலாம்?');
    if (user.userType === 'RETIREE') extra.push('ஓய்வூதிய பணத்தை பாதுகாப்பாக எப்படி பயன்படுத்தலாம்?');
    if (user.riskTolerance === 'LOW') extra.push('இந்தியாவில் குறைந்த அபாய முதலீடுகள் என்ன?');
    if (user.riskTolerance === 'HIGH') extra.push('SIP-ஐ எளிய படிகளில் எப்படி தொடங்கலாம்?');
  } else {
    if (user.userType === 'STUDENT') extra.push('What student loan options do I have?');
    if (user.userType === 'SMALL_BUSINESS_OWNER') extra.push('How can I get a MUDRA loan step by step?');
    if (user.userType === 'RETIREE') extra.push('How should I use my retirement money safely?');
    if (user.riskTolerance === 'LOW') extra.push('What are low-risk options in India?');
    if (user.riskTolerance === 'HIGH') extra.push('How do I start a SIP in simple steps?');
  }
  return [...extra, ...base].slice(0, 5);
}
