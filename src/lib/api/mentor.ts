"use client";
/* =====================================================================
 * MENTOR ADAPTER (intern) — khớp contract BE thật (probe 2026-11-21):
 *  GET  /intern/me/ai-mentor/conversations
 *      → {items: [{id, title, status, createdAt, updatedAt, lastMessageAt}], total, page, pageSize}
 *  GET  /intern/me/ai-mentor/conversations/{id}
 *      → {conversation: {...}, messages: [{id, role: user|assistant, content, aiRunId, createdAt}]}
 *  POST /intern/me/ai-mentor/conversations {title}
 *      → {id, title, status, createdAt, updatedAt, lastMessageAt}
 *  POST /intern/me/ai-mentor/conversations/{id}/messages {content}
 *      → {conversation, userMessage, assistantMessage, summary, followUps[]}
 *  POST /intern/me/ai-mentor/conversations/{id}/archive → ack
 * ===================================================================== */
import { request } from "./client";
import { array, nullable, record, string } from "./parse";
import type { MentorConversation, MentorMessage } from "@/lib/types";

/* --------------------- parser dạng BE thật --------------------- */

interface ConversationDto {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
}

function parseConversationDto(value: unknown): ConversationDto {
  const v = record(value);
  return {
    id: string(v.id),
    title: string(v.title),
    status: nullable(v.status, string) ?? "active",
    createdAt: nullable(v.createdAt, string) ?? "",
    updatedAt: nullable(v.updatedAt, string) ?? "",
    lastMessageAt: nullable(v.lastMessageAt, string),
  };
}

function dtoToConversation(dto: ConversationDto, messages: MentorMessage[] = []): MentorConversation {
  return {
    id: dto.id,
    title: dto.title,
    archived: dto.status === "archived",
    messages,
  };
}

function parseMessage(value: unknown): MentorMessage {
  const m = record(value);
  return {
    id: string(m.id),
    from: m.role === "user" ? "me" : "ai",
    text: string(m.content),
    at: nullable(m.createdAt, string) ?? "",
  };
}

/* ------------------------------ public API ------------------------------ */

export async function listConversations(): Promise<MentorConversation[]> {
  const body = await request("/intern/me/ai-mentor/conversations?page=1&pageSize=50", (value) => {
    const r = record(value);
    return array(r.items, parseConversationDto);
  });
  return body.map((dto) => dtoToConversation(dto));
}

export async function getConversation(id: string): Promise<MentorConversation> {
  return request(`/intern/me/ai-mentor/conversations/${encodeURIComponent(id)}`, (value) => {
    const r = record(value);
    const dto = parseConversationDto(r.conversation);
    const messages = array(r.messages ?? [], parseMessage);
    return dtoToConversation(dto, messages);
  });
}

export async function sendMentorMessage(
  id: string,
  content: string,
): Promise<{ reply: string; conversation: MentorConversation; followUps: string[] }> {
  return request(
    `/intern/me/ai-mentor/conversations/${encodeURIComponent(id)}/messages`,
    (value) => {
      const r = record(value);
      const dto = parseConversationDto(r.conversation);
      const userMsg = record(r.userMessage);
      const aiMsg = record(r.assistantMessage);
      const messages = [
        parseMessage(userMsg),
        parseMessage(aiMsg),
      ];
      const followUps = Array.isArray(r.followUps)
        ? r.followUps.filter((x): x is string => typeof x === "string")
        : [];
      return {
        reply: string(aiMsg.content),
        conversation: dtoToConversation(dto, messages),
        followUps,
      };
    },
    { method: "POST", body: { content } },
  );
}

export async function createConversation(title: string): Promise<MentorConversation> {
  const dto = await request("/intern/me/ai-mentor/conversations", parseConversationDto, {
    method: "POST",
    body: { title },
  });
  return dtoToConversation(dto);
}

export async function archiveConversation(id: string): Promise<MentorConversation> {
  /* BE trả ack — tải lại conversation sau khi lưu trữ cho chắc dữ liệu. */
  await request(
    `/intern/me/ai-mentor/conversations/${encodeURIComponent(id)}/archive`,
    (value) => value,
    { method: "POST", body: {} },
  );
  return getConversation(id).catch(() => ({
    id,
    title: "",
    archived: true,
    messages: [],
  }));
}
