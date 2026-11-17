/** Only OXY Journey member-chat URLs are accepted; always return the user's side. */
export function userChatUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    if (!['http:', 'https:'].includes(url.protocol)
      || !/^\/oxy-journey\/chat\/[^/]+(?:\/(?:user|partner))?\/?$/i.test(url.pathname)) return null;
    url.pathname = url.pathname.replace(/\/(?:user|partner)\/?$/i, '').replace(/\/$/, '') + '/user';
    return url.href;
  } catch { return null; }
}

export function chatUrlFromReply(reply: string): string | null {
  return userChatUrl(reply.match(/https?:\/\/[^\s)\]]+\/oxy-journey\/chat\/[^\s)\]]+/i)?.[0]);
}

/** Keep persisted replies intact while hiding a link already shown beside its person. */
export function withoutRepeatedChatLink(reply: string, shownUrls: Iterable<string>): string {
  const url = chatUrlFromReply(reply);
  if (!url || !new Set(shownUrls).has(url)) return reply;
  return reply
    .replace(/\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/gi,
      (link, href) => userChatUrl(href) === url ? '' : link)
    .replace(/, so continue the conversation(?: directly)? here:\s*$/i, '.')
    .replace(/\s*Continue the conversation(?: directly)? here:\s*$/i, '')
    .trim() || "You're connected.";
}
