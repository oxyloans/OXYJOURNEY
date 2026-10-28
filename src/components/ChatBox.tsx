import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./ChatBox.css";

export type ChatBoxVariant = "default" | "compact";
export type ChatBoxDensity = "compact" | "standard" | "comfortable";
export type ChatBoxLayoutMode = "standard" | "split" | "overlay";

export type ChatBoxUser = {
  id: string;
  name: string;
  avatarUrl?: string;
};

export type ChatBoxAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
};

export type ChatBoxMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  attachments?: ChatBoxAttachment[];
  streaming?: boolean;
};

export type ChatBoxConversation = {
  id: string;
  title: string;
  subtitle?: string;
  messages: ChatBoxMessage[];
};

export type ChatBoxAdapter = {
  sendMessage: (args: {
    conversationId: string;
    message: string;
    attachments: ChatBoxAttachment[];
    onChunk: (chunk: string) => void;
    onReplace?: (text: string) => void;
  }) => Promise<void>;
};

export type ChatBoxFeatures = {
  conversationList?: boolean;
  conversationHeader?: boolean;
  attachments?: boolean;
  suggestions?: boolean;
  scrollToBottom?: boolean;
  helperText?: boolean;
  autoScroll?: boolean;
};

type ChatBoxProps = {
  adapter: ChatBoxAdapter;
  currentUser: ChatBoxUser;
  members: ChatBoxUser[];
  initialConversations: ChatBoxConversation[];
  activeConversationId: string;
  onActiveConversationChange: (conversationId: string) => void;
  variant?: ChatBoxVariant;
  density?: ChatBoxDensity;
  layoutMode?: ChatBoxLayoutMode;
  suggestions?: string[];
  suggestionsAutoSubmit?: boolean;
  features?: ChatBoxFeatures;
  sx?: React.CSSProperties;
  headerTitle?: string;
  headerSubtitle?: string;
  headerAction?: ReactNode;
  emptyState?: ReactNode;
  helperText?: string;
  inputPlaceholder?: string;
  busy?: boolean;
  onBeforeSend?: (message: string) => boolean;
  resumeMessage?: { id: string; text: string; replaceLast?: boolean } | null;
  onMessagesChange?: (conversationId: string, messages: ChatBoxMessage[]) => void;
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CodeBlock({
  className,
  children,
  ...props
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const codeString = String(children || "").replace(/\n$/, "");
  const isInline = !match && !String(children).includes("\n");

  if (isInline) {
    return (
      <code className="cb-inline-code" {...props}>
        {children}
      </code>
    );
  }

  const handleCopy = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(codeString).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  };

  return (
    <div className="cb-code-block">
      <div className="cb-code-header">
        <span className="cb-code-lang">{language || "code"}</span>
        <button
          type="button"
          className="cb-code-copy"
          onClick={handleCopy}
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <pre className="cb-code-pre">
        <code className={className} {...props}>
          {codeString}
        </code>
      </pre>
    </div>
  );
}

const markdownComponents = {
  code: CodeBlock,
  table: ({ children, ...props }: any) => (
    <div className="cb-table-wrapper">
      <table {...props}>{children}</table>
    </div>
  ),
  a: ({ href, children, node: _node, ...props }: any) => {
    const label = textOf(children).trim();
    // A bare URL (label is the URL itself) becomes a tidy "open link" button instead of raw text.
    if (href && /^https?:\/\//i.test(label)) {
      let host = label;
      try { host = new URL(href).hostname.replace(/^www\./, ""); } catch { /* keep the raw label */ }
      return (
        <a className="cb-link-card" href={href} target="_blank" rel="noopener noreferrer" title={href} {...props}>
          <span className="cb-link-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
          </span>
          <span className="cb-link-copy"><strong>{host}</strong><small>Open in a new tab</small></span>
          <svg className="cb-link-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
        </a>
      );
    }
    // The "chat window" link after a partner is connected: a clear button, opened only on click.
    if (href && label === "Open chat window") {
      return (
        <a className="cb-chat-cta" href={href} target="_blank" rel="noopener noreferrer" {...props}>
          <span className="cb-chat-cta-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11a8 8 0 0 1-8 8H7l-4 3V7a5 5 0 0 1 5-5h5a8 8 0 0 1 8 9Z" /></svg>
          </span>
          <span className="cb-chat-cta-copy"><strong>Open chat window</strong><small>Talk to your partner directly</small></span>
          <svg className="cb-chat-cta-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>
        </a>
      );
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  },
  img: ({ src, alt, ...props }: any) => (
    <img src={src} alt={alt || "Image"} className="cb-markdown-img" loading="lazy" {...props} />
  ),
};

// Rotating status words while the agent works, in the spirit of Claude's "Pondering…".
// They describe what OXY Journeys actually does: understand a need and match it to people.
const THINKING_TERMS = [
  "Listening closely",
  "Understanding your need",
  "Mapping your requirement",
  "Scanning our network",
  "Matching you with people",
  "Connecting the dots",
  "Charting your journey",
  "Finding the right fit",
  "Weighing the options",
  "Lining up your next step",
];

function ThinkingIndicator({ longer }: { longer: boolean }) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * THINKING_TERMS.length));
  useEffect(() => {
    const timer = window.setInterval(() => setIndex(current => (current + 1) % THINKING_TERMS.length), 2400);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div className="cb-response-loader" role="status" aria-label="OXY AI is preparing a response">
      <span key={index} className="cb-thinking-text">{THINKING_TERMS[index]}</span>
      <span className="cb-thinking-dots" aria-hidden="true"><i /><i /><i /></span>
      {longer && <span className="cb-thinking-note">taking a little longer</span>}
    </div>
  );
}

// Flattens React markdown children to plain text.
function textOf(node: any): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return textOf(node.props?.children);
}

const initialsOf = (name: string) =>
  name.replace(/^(mr|mrs|ms|dr|rtn|prof)\.?\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join("") || "•";

/**
 * "Name — Role" lists (the people the agent suggests) render as pickable cards.
 * Any other ordered list stays a normal list. Without onPick the cards are read-only.
 */
const PickPersonContext = createContext<((name: string) => void) | undefined>(undefined);

const peopleMarkdownComponents = {
    ...markdownComponents,
    ol: ({ children, ...props }: any) => {
      const onPick = useContext(PickPersonContext);
      const items = Children.toArray(children).filter(isValidElement) as any[];
      const people = items.length > 0 && items.every(item => /\s[—–-]\s/.test(textOf(item.props.children)));
      if (!people) return <ol {...props}>{children}</ol>;
      return (
        <div className="cb-people" role="list">
          {items.map((item, index) => {
            const [name, ...rest] = textOf(item.props.children).trim().split(/\s[—–-]\s/);
            const role = rest.join(" — ").trim();
            // Long specialty lists ("A, B, C, …") become short tags instead of a wall of text.
            const tags = role.split(/\s*,\s*/).map(tag => tag.trim()).filter(Boolean);
            const body = (
              <>
                <span className="cb-person-avatar" aria-hidden="true">{initialsOf(name)}</span>
                <span className="cb-person-copy">
                  <strong>{name.trim()}</strong>
                  {tags.length > 0 && (
                    <span className="cb-person-tags">
                      {tags.slice(0, 3).map(tag => <em key={tag}>{tag}</em>)}
                      {tags.length > 3 && <em className="is-more" title={tags.slice(3).join(", ")}>+{tags.length - 3} more</em>}
                    </span>
                  )}
                </span>
                {onPick && <span className="cb-person-cta">Connect<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg></span>}
              </>
            );
            return onPick ? (
              <button key={index} type="button" role="listitem" className="cb-person" style={{ animationDelay: `${index * 70}ms` }} onClick={() => onPick(name.trim())} aria-label={`Connect with ${name.trim()}`}>{body}</button>
            ) : (
              <div key={index} role="listitem" className="cb-person is-static" style={{ animationDelay: `${index * 70}ms` }}>{body}</div>
            );
          })}
        </div>
      );
    },
};

function filterIntroMessages(msgs: ChatBoxMessage[] = []): ChatBoxMessage[] {
  return msgs.filter(
    (m) =>
      !m.content.startsWith("You selected ") &&
      !m.content.includes("Tell me what you want to do next") &&
      !m.content.includes("Tell me what you need at this stage")
  );
}

export default function ChatBox({
  adapter,
  currentUser,
  members,
  initialConversations,
  activeConversationId,
  onActiveConversationChange,
  variant = "default",
  density = "standard",
  layoutMode = "standard",
  suggestions = [],
  suggestionsAutoSubmit = false,
  features = {},
  sx,
  headerTitle,
  headerSubtitle,
  headerAction,
  emptyState,
  helperText = "AI responses can contain mistakes. Verify important information.",
  inputPlaceholder = "Ask anything...",
  busy = false,
  onMessagesChange,
  onBeforeSend,
  resumeMessage,
}: ChatBoxProps) {
  const cleanInitialConversations = useMemo(
    () =>
      initialConversations.map((c) => ({
        ...c,
        messages: filterIntroMessages(c.messages),
      })),
    [initialConversations]
  );
  const [conversations, setConversations] = useState(cleanInitialConversations);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<ChatBoxAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [waitingLonger, setWaitingLonger] = useState(false);
  const [sendError, setSendError] = useState("");
  useEffect(() => {
    if (!sending) { setWaitingLonger(false); return; }
    const timer = setTimeout(() => setWaitingLonger(true), 8000);
    return () => clearTimeout(timer);
  }, [sending]);
  const [showConversationList, setShowConversationList] = useState(false);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [likedMessageIds, setLikedMessageIds] = useState<Record<string, boolean>>({});

  const handleCopyMessage = (id: string, text: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedMessageId(id);
        setTimeout(() => setCopiedMessageId(null), 2000);
      }).catch(() => {});
    }
  };

  const toggleLikeMessage = (id: string) => {
    setLikedMessageIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumedId = useRef("");
  const conversationsRef = useRef(cleanInitialConversations);

  // Auto-resize composer textarea as user types or picks suggestions
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  }, [input]);

  // Voice input: dictate into the composer, then edit the text before sending.
  const SpeechRecognitionCtor: any =
    typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : undefined;
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef<any>(null);

  function stopVoice() {
    try { recognitionRef.current?.stop(); } catch { /* already stopped */ }
  }

  function toggleVoice() {
    if (!SpeechRecognitionCtor) return;
    if (listening) { stopVoice(); return; }
    setVoiceError("");
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = navigator.language || "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;
    const base = input.trim() ? input.trim() + " " : "";
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript;
      setInput((base + transcript).slice(0, 4000));
    };
    recognition.onerror = (event: any) => {
      const code = event?.error;
      if (code === "not-allowed" || code === "service-not-allowed") setVoiceError("Microphone access is blocked. Allow it in your browser settings and try again.");
      else if (code === "no-speech") setVoiceError("I didn't hear anything. Tap the mic and try again.");
      else if (code !== "aborted") setVoiceError("Voice input stopped. Please try again.");
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      inputRef.current?.focus();
    };
    recognitionRef.current = recognition;
    try { recognition.start(); setListening(true); } catch { setListening(false); }
  }

  useEffect(() => () => { try { recognitionRef.current?.abort(); } catch { /* ignore */ } }, []);

  const activeConversation = useMemo(
    () =>
      conversations.find((item) => item.id === activeConversationId) ||
      conversations[0],
    [conversations, activeConversationId]
  );

  useEffect(() => {
    if (!sending) {
      conversationsRef.current = cleanInitialConversations;
      setConversations(cleanInitialConversations);
    }
  }, [cleanInitialConversations, sending]);

  useEffect(() => {
    if (!features.autoScroll) return;
    const el = scrollerRef.current;
    if (!el) return;
    const isStreaming = activeConversation?.messages?.some((m) => m.streaming);
    requestAnimationFrame(() => {
      if (isStreaming) {
        el.scrollTop = el.scrollHeight;
      } else {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      }
    });
  }, [activeConversation?.messages, features.autoScroll]);

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [activeConversationId]);

  const updateConversationMessages = (
    conversationId: string,
    updater: (messages: ChatBoxMessage[]) => ChatBoxMessage[]
  ) => {
    let changedMessages: ChatBoxMessage[] | undefined;
    const next = conversationsRef.current.map((conversation) => {
      if (conversation.id !== conversationId) return conversation;
      changedMessages = updater(filterIntroMessages(conversation.messages));
      return { ...conversation, messages: changedMessages };
    });
    conversationsRef.current = next;
    setConversations(next);
    // Notify the parent outside a state updater/render, including rapid stream chunks.
    if (changedMessages) onMessagesChange?.(conversationId, changedMessages);
  };

  async function submit(messageOverride?: string, replaceLast = false) {
    const message = (messageOverride ?? input).trim();
    if (!message || sending || busy || !activeConversation) return;
    if (onBeforeSend && !onBeforeSend(message)) { setInput(message); return; }
    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch { /* ignore */ } }

    const conversationId = activeConversation.id;
    const selectedAttachments = attachments;
    const userMessage: ChatBoxMessage = {
      id: makeId("user"),
      role: "user",
      content: message,
      attachments: selectedAttachments,
      createdAt: new Date().toISOString(),
    };
    const assistantId = makeId("assistant");

    // Resuming after login: replace the unanswered "please log in" exchange
    // instead of showing the same user message twice.
    const dropTrailingExchange = (messages: ChatBoxMessage[]) => {
      if (!replaceLast) return messages;
      const last = messages[messages.length - 1], prev = messages[messages.length - 2];
      return last?.role === "assistant" && prev?.role === "user" && prev.content.trim() === message
        ? messages.slice(0, -2)
        : messages;
    };
    updateConversationMessages(conversationId, (messages) => [
      ...dropTrailingExchange(filterIntroMessages(messages)),
      userMessage,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        streaming: true,
        createdAt: new Date().toISOString(),
      },
    ]);

    setInput("");
    setSendError("");
    setAttachments([]);
    setSending(true);

    // Paced drain: network chunks arrive in bursts, so queue them and reveal a
    // steady amount per frame. Larger backlogs drain faster so we never lag far
    // behind the server, and the tail finishes smoothly once the stream ends.
    let pendingText = "", frame = 0, drainWaiters: Array<() => void> = [];
    const append = (text: string) =>
      updateConversationMessages(conversationId, messages => messages.map(item => item.id === assistantId ? { ...item, content: item.content + text, streaming: true } : item));
    const settle = () => { const waiters = drainWaiters; drainWaiters = []; waiters.forEach(resolve => resolve()); };
    const tick = () => {
      frame = 0;
      if (!pendingText) { settle(); return; }
      let count = Math.min(pendingText.length, Math.max(2, Math.ceil(pendingText.length / 10)));
      const last = pendingText.charCodeAt(count - 1);
      if (last >= 0xd800 && last <= 0xdbff && count < pendingText.length) count++; // keep surrogate pairs intact
      const text = pendingText.slice(0, count);
      pendingText = pendingText.slice(count);
      append(text);
      if (pendingText) frame = requestAnimationFrame(tick); else settle();
    };
    const flushText = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      const text = pendingText; pendingText = "";
      if (text) append(text);
      settle();
    };
    const drainText = () => pendingText
      ? new Promise<void>(resolve => { drainWaiters.push(resolve); if (!frame) frame = requestAnimationFrame(tick); })
      : Promise.resolve();
    try {
      await adapter.sendMessage({
        conversationId,
        message,
        attachments: selectedAttachments,
        onChunk: chunk => {
          pendingText += chunk;
          if (!frame) frame = requestAnimationFrame(tick);
        },
        onReplace: text => {
          pendingText = "";
          if (frame) cancelAnimationFrame(frame);
          frame = 0;
          settle();
          updateConversationMessages(conversationId, messages => messages.map(item => item.id === assistantId ? { ...item, content: text, streaming: true } : item));
        },
      });

      await drainText();
      updateConversationMessages(conversationId, (messages) =>
        messages.map((item) =>
          item.id === assistantId ? { ...item, streaming: false } : item
        )
      );
    } catch (error) {
      flushText();
      console.error("ChatBox send failed", error);
      const detail = error instanceof Error ? error.message : "Unable to complete the response.";
      const explanation = error instanceof Error && error.name === "TimeoutError"
        ? "The response took too long. Please try again."
        : /failed to fetch|network|load failed/i.test(detail)
          ? "Could not reach the chat service. Check your connection and try again."
          : error instanceof Error && error.name === "AbortError"
            ? "The response was interrupted. Please try again."
            : detail;
      setSendError(explanation);
      setInput(current => current || message);
      updateConversationMessages(conversationId, (messages) =>
        messages.map((item) =>
          item.id === assistantId
            ? {
                ...item,
                streaming: false,
                content:
                  item.content ||
                  "The response could not be completed. Your message is ready to retry below.",
              }
            : item
        )
      );
    } finally {
      setSending(false);
      window.setTimeout(() => inputRef.current?.focus(), 40);
    }
  }

  useEffect(() => {
    if (!resumeMessage || resumeMessage.id === resumedId.current || sending || busy) return;
    resumedId.current = resumeMessage.id;
    void submit(resumeMessage.text, resumeMessage.replaceLast);
    // Resume once, after the OTP callback has stored the account details.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeMessage, sending, busy]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // On mobile devices, allow Enter to insert a new line so soft keyboard doesn't accidentally send
    const isMobileViewport = typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing &&
      !isMobileViewport
    ) {
      event.preventDefault();
      void submit();
    }
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const next = files.slice(0, 5).map((file) => ({
      id: makeId("file"),
      name: file.name,
      size: file.size,
      type: file.type,
      file,
    }));

    setAttachments((current) => [...current, ...next].slice(0, 5));
    event.target.value = "";
  }

  function scrollToLatest() {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el || !features.scrollToBottom) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowJumpButton(distance > 180);
  }

  const membersLabel = members.length > 1 ? `${members.length} participants` : currentUser.name;
  const isBusy = sending || busy;
  const visibleMessages = useMemo(() => {
    return filterIntroMessages(activeConversation?.messages || []);
  }, [activeConversation?.messages]);

  // Only the newest reply offers one-click "Connect" cards; older ones stay read-only.
  const lastAssistantId = [...visibleMessages].reverse().find(message => message.role === "assistant")?.id;
  const submitRef = useRef(submit);
  submitRef.current = submit;
  const pickPerson = useMemo(() => (name: string) => void submitRef.current(`I want to connect with ${name}`), []);

  const hasUserMessages = Boolean(
    visibleMessages.some((message) => message.role === "user")
  );

  const targetJourneyName = useMemo(() => {
    if (!headerTitle || headerTitle === "OXY Journeys AI" || headerTitle === "OXY Journeys") {
      return "OXY Journeys";
    }
    return headerTitle.replace(/\s+journeys?$/i, "").trim();
  }, [headerTitle]);

  const fullWelcomeText = useMemo(() => {
    return `Welcome to ${targetJourneyName}`;
  }, [targetJourneyName]);

  const [typedText, setTypedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    setTypedText("");
    setIsTyping(true);
    let idx = 0;
    const text = fullWelcomeText;
    if (!text) return;

    // Slower, deliberate typewriter rhythm (190ms per character)
    const interval = setInterval(() => {
      idx += 1;
      setTypedText(text.slice(0, idx));
      if (idx >= text.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 190);

    return () => clearInterval(interval);
  }, [fullWelcomeText]);

  return (
    <section
      className={`cb-root cb-${variant} cb-density-${density} cb-layout-${layoutMode}`}
      style={sx}
    >
      {features.conversationList && (
        <aside className={`cb-conversations ${showConversationList ? "open" : ""}`}>
          <div className="cb-conversations-head">
            <strong>Conversations</strong>
            <button type="button" onClick={() => setShowConversationList(false)} aria-label="Close conversations">×</button>
          </div>
          <div className="cb-conversations-list">
            {conversations.map((conversation) => (
              <button
                type="button"
                key={conversation.id}
                className={conversation.id === activeConversationId ? "active" : ""}
                onClick={() => {
                  onActiveConversationChange(conversation.id);
                  setShowConversationList(false);
                }}
              >
                <span>{conversation.title}</span>
                <small>{conversation.subtitle || `${conversation.messages.length} messages`}</small>
              </button>
            ))}
          </div>
        </aside>
      )}

      <div className="cb-main">
        {features.conversationHeader && (
          <header className="cb-header">
            <div className="cb-header-copy">
              {features.conversationList && (
                <button
                  className="cb-header-list"
                  type="button"
                  onClick={() => setShowConversationList((value) => !value)}
                  aria-label="Open conversations"
                >
                  ☰
                </button>
              )}
              <div>
                <strong>{headerTitle || activeConversation?.title || "OXY Journeys"}</strong>
                <span>{headerSubtitle || activeConversation?.subtitle || membersLabel}</span>
              </div>
            </div>
            {headerAction}
          </header>
        )}

        <div className="cb-scroll" ref={scrollerRef} onScroll={handleScroll}>
          {!hasUserMessages ? (
            <div className="cb-hero-welcome">
              <h1 className="cb-hero-title">
                <span className="cb-hero-highlight">{typedText}</span>
                {isTyping && <span className="cb-hero-caret" aria-hidden="true" />}
              </h1>

              {features.suggestions && suggestions && suggestions.length > 0 && (
                <div className="cb-hero-grid" role="group" aria-label="Suggested questions">
                  {Array.from(new Set(suggestions)).slice(0, 4).map((suggestion) => (
                    <button
                      type="button"
                      key={suggestion}
                      className="cb-hero-card"
                      disabled={isBusy}
                      onClick={() => {
                        if (suggestionsAutoSubmit) {
                          void submit(suggestion);
                        } else {
                          setInput(suggestion);
                          inputRef.current?.focus();
                        }
                      }}
                    >
                      <span className="cb-hero-card-text">{suggestion}</span>
                      <span className="cb-hero-card-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M7 17L17 7M17 7H9M17 7V15" />
                        </svg>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="cb-messages">
              {visibleMessages.map((message) => (
                <div className={`cb-message-row ${message.role}`} key={message.id}>
                  {message.role === "assistant" && (
                    <div className={`cb-avatar${message.streaming ? " is-working" : ""}`} aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none"><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
                    </div>
                  )}
                  <article className={`cb-message ${message.role}`}>
                    {message.role === "assistant" ? (
                      <div className="cb-markdown">
                        {message.streaming && !message.content ? (
                          <ThinkingIndicator longer={waitingLonger} />
                        ) : (
                          <>
                            <PickPersonContext.Provider value={message.id === lastAssistantId && !message.streaming && !isBusy ? pickPerson : undefined}>
                              <ReactMarkdown remarkPlugins={[remarkGfm]} components={peopleMarkdownComponents}>
                                {message.content}
                              </ReactMarkdown>
                            </PickPersonContext.Provider>
                            {!message.streaming && message.content && (
                              <div className="cb-message-actions">
                                <button
                                  type="button"
                                  className="cb-copy-button"
                                  onClick={() => handleCopyMessage(message.id, message.content)}
                                  title="Copy response"
                                  aria-label="Copy response"
                                >
                                  {copiedMessageId === message.id ? (
                                    <>
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                                      <span>Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  className={`cb-copy-button cb-like-button ${likedMessageIds[message.id] ? "is-liked" : ""}`}
                                  onClick={() => toggleLikeMessage(message.id)}
                                  title={likedMessageIds[message.id] ? "Marked helpful" : "Helpful response"}
                                  aria-label="Mark response as helpful"
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill={likedMessageIds[message.id] ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M7 10v12M15 10.5a3 3 0 0 0-3-3l-2 1v-3.5a2.5 2.5 0 0 0-5 0V11l-3 3v8h14.5a2.5 2.5 0 0 0 2.5-2.5V13a2.5 2.5 0 0 0-2.5-2.5h-1.5z" />
                                  </svg>
                                  <span>{likedMessageIds[message.id] ? "Helpful ✓" : "Helpful"}</span>
                                </button>
                              </div>
                            )}
                          </>
                        )}
                        {message.streaming && message.content && <span className="cb-stream-caret" aria-hidden="true" />}
                      </div>
                    ) : (
                      <>
                        <p>{message.content}</p>
                        {!!message.attachments?.length && (
                          <div className="cb-message-files">
                            {message.attachments.map((file) => (
                              <span key={file.id}>{file.name}</span>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </article>
                </div>
              ))}
            </div>
          )}

          {features.scrollToBottom && showJumpButton && (
            <button className="cb-jump" type="button" onClick={scrollToLatest}>
              ↓ Latest
            </button>
          )}
        </div>

        <div className="cb-composer-shell">
          {sendError && <div className="cb-send-error" role="alert"><span>{sendError}</span><button type="button" onClick={() => { setSendError(""); inputRef.current?.focus(); }} aria-label="Dismiss response error">×</button></div>}
          {!!attachments.length && (
            <div className="cb-attachment-chips">
              {attachments.map((file) => (
                <span key={file.id}>
                  <b>{file.name}</b>
                  <small>{fileSize(file.size)}</small>
                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => setAttachments((current) => current.filter((item) => item.id !== file.id))}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {(listening || voiceError) && (
            <div className={`cb-voice-status${voiceError && !listening ? " is-error" : ""}`} role="status" aria-live="polite">
              {listening ? (
                <>
                  <span className="cb-voice-bars" aria-hidden="true"><i /><i /><i /><i /><i /></span>
                  <span>Listening… speak now. Tap the mic to stop, then edit if needed.</span>
                </>
              ) : (
                <span>{voiceError}</span>
              )}
            </div>
          )}

          <form className={`cb-composer${listening ? " is-listening" : ""}`} onSubmit={handleSubmit}>
            {features.attachments && (
              <>
                <input
                  ref={fileInputRef}
                  className="cb-file-input"
                  type="file"
                  multiple
                  onChange={handleFiles}
                  accept="image/*,.pdf,.doc,.docx,.txt,.csv"
                />
                <button
                  type="button"
                  className="cb-attach"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Attach files"
                  title="Attach files"
                >
                  +
                </button>
              </>
            )}

            <textarea
              ref={inputRef}
              rows={1}
              maxLength={4000}
              value={input}
              disabled={isBusy}
              placeholder={inputPlaceholder}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
            />

            {SpeechRecognitionCtor && (
              <button
                type="button"
                className={`cb-mic${listening ? " is-listening" : ""}`}
                onClick={toggleVoice}
                disabled={isBusy}
                aria-label={listening ? "Stop voice input" : "Start voice input"}
                aria-pressed={listening}
                title={listening ? "Stop recording" : "Speak your message"}
              >
                {listening ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2.5" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
                )}
              </button>
            )}

            <button className="cb-send" type="submit" disabled={!input.trim() || isBusy} aria-label="Send message">
              {isBusy ? (
                <span className="cb-spinner" />
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </form>

          {features.helperText && (
            <div className="cb-helper">
              <span>{helperText}</span>
              <span>Enter to send · Shift + Enter for new line</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
