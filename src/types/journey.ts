export type JourneyMode = "life-cycle" | "platform" | "profession";
export type ChatContextType = JourneyMode | "classification";

export type JourneyOption = {
  id: string;
  title: string;
  summary?: string;
  assistantIntro?: string;
  suggestions?: string[];
};

export type LifeStage = {
  id: string;
  shortLabel: string;
  title: string;
  description: string;
};

export type Platform = {
  id: string;
  name: string;
  shortName: string;
  description: string;
};

export type JourneyLoadRequest = {
  mode: JourneyMode;
  platformId?: string;
  search?: string;
};

export type ChatContext = {
  type: ChatContextType;
  title: string;
  subtitle: string;
  assistantIntro: string;
  suggestions: string[];
  stageId?: string;
  platformId?: string;
  journeyId?: string;
  classificationValue?: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type ProfileInfo = {
  name?: string;
  subtitle?: string;
  avatarUrl?: string;
};

export type LandingProps = {
  /** Opens the chat under this classification (e.g. "Doctor"). */
  initialClassification?: string;
  /** Sent automatically as the first message once the chat is ready. */
  initialPrompt?: string;
  onSearch?: (query: string, context?: ChatContext, sessionId?: string | null, streamOptions?: { onChunk?: (chunk: string) => void; onReplace?: (text: string) => void; onMetadata?: (metadata: { sessionId?: string | null; loginRequired?: boolean }) => void; signal?: AbortSignal }) => Promise<{ reply?: string | null; sessionId?: string | null; loginRequired?: boolean; chatWindowUrl?: string | null; status?: boolean }>;
  onLoadJourneys?: (request: JourneyLoadRequest) => Promise<JourneyOption[]>;
  profile?: ProfileInfo;
  onProfileClick?: () => void;
  initialMode?: JourneyMode;
  initialPlatformId?: string;
  initialStageId?: string;
  initialSidebarExpanded?: boolean;
};
