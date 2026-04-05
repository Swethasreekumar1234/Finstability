import { useAuthStore } from '../frontend/src/store/authStore';
import { FinancialProfile } from '../frontend/src/types';
import { sendMessage, getSuggestedPrompts, ChatMessage } from '../frontend/src/services/OpenrouterService';
import { AIColors, AISpacing, AIRadius, AITypography } from '../frontend/src/theme/aiTheme';
import { GridBackdrop } from '../frontend/src/components/ui';

const FINANCIAL_PROFILE_KEY = 'financial_profile';

interface MarkdownProps {
  text: string;
  isUser: boolean;
}

const MarkdownText: React.FC<MarkdownProps> = ({ text, isUser }) => {
  const textColor = isUser ? AIColors.background : AIColors.text;
  const mutedColor = isUser ? AIColors.background + 'CC' : AIColors.textSecondary;

  const cleaned = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const lines = cleaned.split('\n');

  const renderInline = (line: string, key: number, style: any) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <Text key={key} style={style}>
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <Text key={i} style={{ fontWeight: '700' }}>{part.slice(2, -2)}</Text>;
          }
          return part;
        })}
      </Text>
    );
  };

  const elements: React.ReactElement[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      elements.push(<View key={`space-${i}`} style={{ height: 6 }} />);
      i++;
      continue;
    }

    if (/^[\|\-\s:]+$/.test(trimmed)) { i++; continue; }

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed.split('|').map(c => c.trim()).filter(c => c.length > 0);
      if (cells.length > 0 && !cells.every(c => /^[-:]+$/.test(c))) {
        elements.push(
          <View key={`table-${i}`} style={styles.tableRow}>
            {cells.map((cell, ci) => (
              <Text key={ci} style={[styles.tableCell, { color: ci === 0 ? textColor : mutedColor }, ci === 0 && { fontWeight: '600' }]}>
                {cell.replace(/\*\*/g, '')}
              </Text>
            ))}
          </View>
        );
      }
      i++;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      elements.push(<Text key={`h3-${i}`} style={[styles.mdH3, { color: textColor }]}>{trimmed.slice(4).replace(/\*\*/g, '')}</Text>);
      i++; continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(<Text key={`h2-${i}`} style={[styles.mdH2, { color: textColor }]}>{trimmed.slice(3).replace(/\*\*/g, '')}</Text>);
      i++; continue;
    }
    if (trimmed.startsWith('# ')) {
      elements.push(<Text key={`h1-${i}`} style={[styles.mdH1, { color: textColor }]}>{trimmed.slice(2).replace(/\*\*/g, '')}</Text>);
      i++; continue;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <View key={`bullet-${i}`} style={styles.bulletRow}>
          <Text style={[styles.bulletDot, { color: AIColors.primary }]}>•</Text>
          {renderInline(trimmed.slice(2), i, [styles.bulletText, { color: textColor }])}
        </View>
      );
      i++; continue;
    }

    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      elements.push(
        <View key={`num-${i}`} style={styles.bulletRow}>
          <Text style={[styles.bulletNum, { color: AIColors.primary }]}>{numberedMatch[1]}.</Text>
          {renderInline(numberedMatch[2], i, [styles.bulletText, { color: textColor }])}
        </View>
      );
      i++; continue;
    }

    elements.push(renderInline(trimmed, i, [styles.mdParagraph, { color: textColor }]));
    i++;
  }

  return <View>{elements}</View>;
};

interface BubbleProps {
  message: ChatMessage;
  isLast: boolean;
}

const Bubble: React.FC<BubbleProps> = ({ message, isLast }) => {
  const isUser = message.role === 'user';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(isUser ? 20 : -20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowModel, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
      {!isUser && (
        <View style={styles.avatarFin}>
          <Text style={styles.avatarFinText}>F</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleModel]}>
        {isUser ? (
          <Text style={styles.bubbleTextUser}>{message.text}</Text>
        ) : (
          <MarkdownText text={message.text} isUser={false} />
        )}
      </View>
    </Animated.View>
  );
};

const TypingIndicator: React.FC = () => {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      ])).start();
    pulse(dot1, 0); pulse(dot2, 150); pulse(dot3, 300);
  }, []);

  return (
    <View style={[styles.bubbleRow, styles.bubbleRowModel]}>
      <View style={styles.avatarFin}><Text style={styles.avatarFinText}>F</Text></View>
      <View style={[styles.bubble, styles.bubbleModel, styles.typingBubble]}>
        {[dot1, dot2, dot3].map((d, i) => <Animated.View key={i} style={[styles.typingDot, { opacity: d }]} />)}
      </View>
    </View>
  );
};

export default function AIChatScreen() {
  const navigation = useNavigation();
  const { currentUser: user } = useAuthStore();
  const [profile, setProfile] = useState<FinancialProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef<FlatList>(null);
  const suggestedPrompts = getSuggestedPrompts(user);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(FINANCIAL_PROFILE_KEY);
        if (raw) setProfile(JSON.parse(raw));
      } catch (_) {}
    })();
  }, []);

  useEffect(() => {
    setMessages([{
      role: 'model',
      text: `Hi ${user?.fullName?.split(' ')[0] || 'there'}! 👋 I'm Fin, your AI financial advisor.\n\nAsk me anything about savings, investments, government schemes, budgeting, or loans — I'll give you personalised advice based on your profile.`,
    }]);
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const handleSend = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    const userMsg: ChatMessage = { role: 'user', text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);
    scrollToBottom();
    try {
      const reply = await sendMessage(trimmed, messages, user ?? null, profile);
      setMessages((prev) => [...prev, { role: 'model', text: reply }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'model', text: `Sorry, something went wrong. Please try again.\n\n_Error: ${err.message}_` }]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  }, [isLoading, messages, user, profile]);

  const renderItem = useCallback(({ item, index }: { item: ChatMessage; index: number }) => (
    <Bubble message={item} isLast={index === messages.length - 1} />
  ), [messages.length]);

  return (
    <SafeAreaView style={styles.container}>
      <GridBackdrop />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>F</Text>
            <View style={styles.onlineDot} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Fin</Text>
            <Text style={styles.headerSub}>AI Financial Advisor</Text>
          </View>
        </View>
        <View style={styles.geminiBadge}>
          <Text style={styles.geminiBadgeText}>✦ Gemini</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderItem}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={scrollToBottom}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={isLoading ? <TypingIndicator /> : null}
        />

        {messages.filter((m) => m.role === 'user').length === 0 && (
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsLabel}>Try asking</Text>
            <View style={styles.suggestionsRow}>
              {suggestedPrompts.map((p) => (
                <TouchableOpacity key={p} style={styles.suggestionChip} onPress={() => handleSend(p)} activeOpacity={0.7}>
                  <Text style={styles.suggestionChipText}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Ask Fin anything..."
            placeholderTextColor={AIColors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => handleSend(inputText)}
            blurOnSubmit
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || isLoading) && styles.sendBtnDisabled]}
            onPress={() => handleSend(inputText)}
            disabled={!inputText.trim() || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? <ActivityIndicator size="small" color={AIColors.background} /> : <Text style={styles.sendBtnIcon}>↑</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AIColors.background },
  mdH1: { ...AITypography.h3, marginBottom: 6, marginTop: 4 },
  mdH2: { ...AITypography.bodyLarge, marginBottom: 4, marginTop: 4 },
  mdH3: { ...AITypography.body, marginBottom: 3, marginTop: 4 },
  mdParagraph: { ...AITypography.body, marginBottom: 2 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  bulletDot: { ...AITypography.body, marginRight: 6, marginTop: 2 },
  bulletNum: { ...AITypography.body, marginRight: 6, minWidth: 18 },
  bulletText: { ...AITypography.body, flex: 1 },
  tableRow: { flexDirection: 'row', flexWrap: 'wrap', borderBottomWidth: 1, borderBottomColor: AIColors.border, paddingVertical: 4, marginBottom: 2 },
  tableCell: { ...AITypography.bodySmall, flex: 1, paddingRight: 6 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: AISpacing.lg, paddingVertical: AISpacing.md, borderBottomWidth: 1, borderBottomColor: AIColors.border, backgroundColor: AIColors.surface },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: AIColors.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  backButtonText: { ...AITypography.h3, color: AIColors.primary, fontSize: 20 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: AIColors.primary, justifyContent: 'center', alignItems: 'center' },
  headerAvatarText: { ...AITypography.h3, color: AIColors.background },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ADE80', borderWidth: 2, borderColor: AIColors.surface },
  headerTitle: { ...AITypography.bodyLarge, color: AIColors.text },
  headerSub: { ...AITypography.labelSmall, color: AIColors.textSecondary },
  geminiBadge: { backgroundColor: AIColors.primary + '20', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: AIColors.primary + '40' },
  geminiBadgeText: { ...AITypography.labelSmall, color: AIColors.primary, letterSpacing: 0.5 },
  messageList: { paddingHorizontal: AISpacing.md, paddingTop: AISpacing.md, paddingBottom: AISpacing.sm },
  bubbleRow: { flexDirection: 'row', marginBottom: AISpacing.sm, alignItems: 'flex-end', gap: 8 },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubbleRowModel: { justifyContent: 'flex-start' },
  avatarFin: { width: 30, height: 30, borderRadius: 15, backgroundColor: AIColors.primary, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarFinText: { ...AITypography.bodySmall, color: AIColors.background },
  bubble: { maxWidth: '78%', borderRadius: AIRadius.lg, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { backgroundColor: AIColors.primary, borderBottomRightRadius: 4 },
  bubbleModel: { backgroundColor: AIColors.surface, borderWidth: 1, borderColor: AIColors.border, borderBottomLeftRadius: 4 },
  bubbleTextUser: { ...AITypography.body, color: AIColors.background },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 14, paddingHorizontal: 16 },
  typingDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: AIColors.primary },
  suggestionsContainer: { paddingHorizontal: AISpacing.md, paddingBottom: AISpacing.sm },
  suggestionsLabel: { ...AITypography.labelSmall, color: AIColors.textMuted, marginBottom: 6 },
  suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  suggestionChip: { backgroundColor: AIColors.surface, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: AIColors.border },
  suggestionChipText: { ...AITypography.bodySmall, color: AIColors.textSecondary },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: AISpacing.md, paddingVertical: AISpacing.sm, borderTopWidth: 1, borderTopColor: AIColors.border, backgroundColor: AIColors.surface, gap: 8 },
  input: { flex: 1, backgroundColor: AIColors.background, borderRadius: AIRadius.xl, borderWidth: 1, borderColor: AIColors.border, color: AIColors.text, ...AITypography.body, paddingHorizontal: 14, paddingVertical: 10, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: AIColors.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnIcon: { ...AITypography.h3, color: AIColors.background },
});
