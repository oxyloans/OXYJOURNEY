import './ChatWindowLink.css';

export default function ChatWindowLink({ href, partnerName }: { href: string; partnerName?: string }) {
  return (
    <a className="chat-window-link" href={href} target="_blank" rel="noopener noreferrer"
      aria-label={partnerName ? `Open chat window with ${partnerName}` : 'Open chat window'}>
      <span className="chat-window-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11a8 8 0 0 1-8 8H7l-4 3V7a5 5 0 0 1 5-5h5a8 8 0 0 1 8 9Z" /></svg>
      </span>
      <span className="chat-window-copy"><strong>Open chat window</strong><small>Talk to your partner directly</small></span>
      <svg className="chat-window-arrow" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>
    </a>
  );
}
