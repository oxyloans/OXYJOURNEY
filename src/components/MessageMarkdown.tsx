import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/** Load the Markdown parser only when an assistant message needs rendering. */
export default function MessageMarkdown({ children, components }: {
  children: string;
  components: Components;
}) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{children}</ReactMarkdown>;
}
