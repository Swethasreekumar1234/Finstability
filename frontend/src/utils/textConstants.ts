import { AppLanguage } from '../i18n/translations';

type ChatCopy = {
  title: string;
  subtitle: string;
  askLabel: string;
  placeholder: string;
  genericError: string;
  greeting: (name: string) => string;
};

type Copy = {
  chat: ChatCopy;
};

const copyByLanguage: Record<AppLanguage, Copy> = {
  en: {
    chat: {
      title: 'Fin',
      subtitle: 'AI money guide',
      greeting: (name: string) => `Hi ${name || 'there'}! I am Fin. I can help with money, savings, loans, and schemes.`,
      askLabel: 'Try this',
      placeholder: 'Ask about money or schemes...',
      genericError: 'Sorry, I could not answer. Please try again.',
    },
  },
  ta: {
    chat: {
      title: 'ஃபின்',
      subtitle: 'ஏஐ பண உதவி',
      greeting: (name: string) => `வணக்கம் ${name || 'நண்பரே'}! நான் ஃபின். பணம், சேமிப்பு, கடன், அரசு திட்டங்கள் பற்றி உதவுவேன்.`,
      askLabel: 'இதை கேளுங்கள்',
      placeholder: 'பணம் அல்லது திட்டங்கள் பற்றி கேளுங்கள்...',
      genericError: 'மன்னிக்கவும். பதில் தர முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
    },
  },
};

export function getSimpleText(language: AppLanguage): Copy {
  return copyByLanguage[language] ?? copyByLanguage.en;
}
