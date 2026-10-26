/** POST stream decoder. Supports SSE, NDJSON and a JSON response fallback. */
export type StreamResult = { reply?: string | null; sessionId?: string | null; loginRequired?: boolean; chatWindowUrl?: string | null; status?: boolean };
export async function decodeVibeCodeStream(response: Response, onChunk?: (chunk: string) => void, onMetadata?: (value: StreamResult) => void, onReplace?: (text: string) => void): Promise<StreamResult> {
  const result: StreamResult = {};
  let reply = "", done = false;
  const append = (text: string) => { if (text) { reply += text; onChunk?.(text); } };
  function consume(raw: string, event = "message") {
    if (done || event === "ping" || event === "heartbeat") return;
    if (raw.trim() === "[DONE]") { done = true; return; }
    let value: any;
    try { value = JSON.parse(raw); } catch { if (event === "error") throw new Error(raw || "Stream failed."); append(raw); return; }
    if (typeof value === "string") { append(value); return; }
    if (!value || typeof value !== "object") return;
    if (value.data && typeof value.data === "object") value = { ...value, ...value.data };
    const kind = String(value.type || event).toLowerCase();
    if (event === "error" || value.error) throw new Error(typeof value.error === "string" ? value.error : value.message || value.text || "Stream failed.");
    const metadata: StreamResult = {};
    for (const key of ["sessionId", "loginRequired", "chatWindowUrl", "status"] as const) {
      if (value[key] !== undefined) Object.assign(metadata, { [key]: value[key] });
    }
    Object.assign(result, metadata);
    if (Object.keys(metadata).length) onMetadata?.(metadata);
    // delta/content/text are incremental fragments. reply is a complete snapshot.
    const delta = typeof value.delta === "string" ? value.delta : value.delta?.content ?? value.choices?.[0]?.delta?.content;
    const metadataEvent = ["metadata", "session", "status", "done", "complete", "end", "login_required"].includes(kind);
    const text = delta ?? value.content ?? value.text ?? value.token ??
      (!metadataEvent ? (typeof value.data === "string" ? value.data : value.message ?? value.response) : undefined);
    if (typeof text === "string") append(text);
    if (typeof value.reply === "string") {
      const tokenEvent = ["token", "chunk", "delta", "content"].includes(kind);
      const finalSnapshot = ["done", "complete", "end"].includes(kind) || value.done === true;
      if (finalSnapshot && reply && !value.reply.startsWith(reply)) {
        reply = value.reply;
        onReplace?.(reply);
      } else if (tokenEvent || !reply) append(value.reply);
      else if (value.reply.startsWith(reply)) append(value.reply.slice(reply.length));
      else if (!reply.startsWith(value.reply)) append(value.reply);
    }
    if (kind === "login_required") { result.loginRequired = true; onMetadata?.({ loginRequired: true }); }
    if (["done", "complete", "end"].includes(kind) || value.done === true) done = true;
  }
  const type = response.headers.get("content-type") || "";
  if (type.includes("application/json") && !type.includes("ndjson")) {
    const body = await response.text();
    try { JSON.parse(body); consume(body); }
    catch (error) {
      // Some servers label newline-delimited JSON as application/json.
      if (error instanceof SyntaxError && body.trim().split(/\r?\n/).length > 1) {
        for (const item of body.split(/\r?\n/)) if (item.trim()) consume(item);
      } else throw error;
    }
    return { ...result, reply };
  }
  if (!response.body) throw new Error("The chat service returned an empty stream.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "", data: string[] = [], event = "message";
  let sse = type.includes("text/event-stream");
  let sniff = !sse && !type.includes("ndjson") && !type.includes("stream+json");
  let sniffBuffer = "";
  const ndjson = type.includes("ndjson") || type.includes("stream+json");
  function line(value: string) {
    if (sse) {
      if (!value) { if (data.length) consume(data.join("\n"), event); data = []; event = "message"; return; }
      if (value.startsWith(":")) return;
      const colon = value.indexOf(":");
      const field = colon < 0 ? value : value.slice(0, colon);
      let payload = colon < 0 ? "" : value.slice(colon + 1);
      if (payload.startsWith(" ")) payload = payload.slice(1);
      if (field === "data") data.push(payload);
      else if (field === "event") event = payload;
    } else if (value.trim()) consume(value);
  }
  function flushLines(eof: boolean) {
    let match: RegExpExecArray | null;
    while ((match = /\r\n|\n|\r/.exec(buffer))) {
      if (!eof && match[0] === "\r" && match.index === buffer.length - 1) break;
      line(buffer.slice(0, match.index)); buffer = buffer.slice(match.index + match[0].length);
      if (done) break;
    }
    if (eof && buffer && !done) { line(buffer); buffer = ""; }
    if (eof && sse && data.length && !done) line("");
  }
  try {
    while (!done) {
      const chunk = await reader.read();
      let text = decoder.decode(chunk.value, { stream: !chunk.done });
      if (sniff) {
        sniffBuffer += text;
        const candidate = sniffBuffer.replace(/^\uFEFF/, "");
        const prefixes = ["data:", "event:", "id:", "retry:", ":"];
        if (!chunk.done && prefixes.some(prefix => prefix.startsWith(candidate))) continue;
        sse = prefixes.some(prefix => candidate.startsWith(prefix));
        text = candidate; sniff = false; sniffBuffer = "";
      }
      if (sse || ndjson) { buffer += text; flushLines(chunk.done); }
      else append(text); // text/plain streams retain whitespace and newlines.
      if (chunk.done) break;
    }
  } finally { try { await reader.cancel(); } catch { /* preserve the original stream error */ } reader.releaseLock(); }
  return { ...result, reply };
}
