import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decodeVibeCodeStream} from './vibeCodeStream.ts';
const encode=new TextEncoder();
function streamed(text,type='text/event-stream') {const bytes=encode.encode(text);return new Response(new ReadableStream({start(controller){for(const byte of bytes)controller.enqueue(Uint8Array.of(byte));controller.close();}}),{headers:{'Content-Type':type}});}
test('SSE preserves Unicode, split CRLF, incremental tokens, metadata, complete reply and DONE',async()=>{
 const chunks=[],metadata=[];
 const result=await decodeVibeCodeStream(streamed(': ping\r\nevent: metadata\r\ndata: {"sessionId":"SESSION-1"}\r\n\r\ndata: {"delta":"Hello "}\r\n\r\ndata: {"content":"తెలుగు"}\r\n\r\nevent: done\r\ndata: {"reply":"Hello తెలుగు","loginRequired":false}\r\n\r\n'),chunk=>chunks.push(chunk),value=>metadata.push(value));
 assert.deepEqual(chunks,['Hello ','తెలుగు']);assert.equal(result.reply,'Hello తెలుగు');assert.equal(result.sessionId,'SESSION-1');assert.equal(result.loginRequired,false);assert.equal(metadata[0].sessionId,'SESSION-1');
});
test('SSE multiline data, raw text, comments and DONE marker',async()=>{
 const value=await decodeVibeCodeStream(streamed(': keepalive\n\ndata: first line\ndata: second line\n\ndata: [DONE]\n\ndata: ignored\n\n'));
 assert.equal(value.reply,'first line\nsecond line');
});
test('NDJSON and JSON final response support',async()=>{
 assert.equal((await decodeVibeCodeStream(streamed('{"sessionId":"s"}\n{"text":"a"}\n{"text":"b"}','application/x-ndjson'))).reply,'ab');
 assert.equal((await decodeVibeCodeStream(new Response(JSON.stringify({reply:'final',sessionId:'s'}),{headers:{'Content-Type':'application/json'}}))).reply,'final');
});
test('plain text preserves whitespace and streamed errors are surfaced',async()=>{
 assert.equal((await decodeVibeCodeStream(streamed('a\n b ','text/plain'))).reply,'a\n b ');
 await assert.rejects(()=>decodeVibeCodeStream(streamed('event: error\ndata: {"message":"Backend unavailable"}\n\n')),/Backend unavailable/);
});
test('onChunk fires before the network stream ends',async()=>{
 let controller;const response=new Response(new ReadableStream({start(value){controller=value;}}),{headers:{'Content-Type':'text/event-stream'}});const chunks=[];
 const complete=decodeVibeCodeStream(response,text=>chunks.push(text));controller.enqueue(encode.encode('data: {"delta":"first"}\n\n'));
 await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(chunks,['first']);controller.enqueue(encode.encode('data: {"delta":" second"}\n\n'));controller.close();assert.equal((await complete).reply,'first second');
});

test('reply fragments and final snapshot do not throw or duplicate',async()=>{
 const value=await decodeVibeCodeStream(streamed('event: chunk\ndata: {"reply":"Hello "}\n\nevent: chunk\ndata: {"reply":"world"}\n\nevent: done\ndata: {"reply":"Hello world"}\n\n'));
 assert.equal(value.reply,'Hello world');
});
test('repeated reply tokens and nested data fields are preserved',async()=>{
 const value=await decodeVibeCodeStream(streamed('data: {"type":"token","reply":"ha"}\n\ndata: {"type":"token","reply":"ha"}\n\ndata: {"data":{"sessionId":"s","token":"!"}}\n\ndata: [DONE]\n\n'));
 assert.equal(value.reply,'haha!');assert.equal(value.sessionId,'s');
});
test('SSE mislabeled as text/plain is recognized even across byte boundaries',async()=>{
 const value=await decodeVibeCodeStream(streamed('data: {"sessionId":"s"}\n\ndata: {"message":"answer"}\n\ndata: [DONE]\n\n','text/plain'));
 assert.equal(value.reply,'answer');assert.equal(value.sessionId,'s');
});
test('NDJSON mislabeled as application/json supports message and response fields',async()=>{
 const value=await decodeVibeCodeStream(streamed('{"message":"one "}\n{"response":"two"}\n','application/json'));
 assert.equal(value.reply,'one two');
});

test('authoritative final snapshot replaces differing partial text',async()=>{
 const replacements=[];const value=await decodeVibeCodeStream(streamed('data: {"delta":"Partial draft"}\n\nevent: done\ndata: {"reply":"Correct final answer"}\n\n'),undefined,undefined,text=>replacements.push(text));
 assert.equal(value.reply,'Correct final answer');assert.deepEqual(replacements,['Correct final answer']);
});
