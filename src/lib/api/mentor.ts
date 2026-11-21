"use client";
/* =====================================================================
 * MENTOR ADAPTER (intern) — /intern/me/ai-mentor/conversations.
 * ===================================================================== */
import { request } from "./client";
import { array, boolean, nullable, number, parsePage, record, string } from "./parse";
import type { MentorConversation, MentorMessage } from "@/lib/mock/types";

function parseConversation(value: unknown): MentorConversation {
  const v = record(value);
  return {
    id: string(v.id),
    title: string(v.title),
    archived: boolean(v.archived),
    messages: array(v.messages, (raw) => {
      const m = record(raw);
      return { id: string(m.id), from: m.from === "me" ? "me" : "ai", text: string(m.text), at: string(m.at) };
    }),
  };
}

export async function listConversations(): Promise<MentorConversation[]> {
  const body = await request("/intern/me/ai-mentor/conversations?page=1&pageSize=50", (value) =>
    parsePage(value, (raw) => {
      const v = record(raw);
      return {
        id: string(v.id),
        title: string(v.title),
        archived: boolean(v.archived),
        messages: [] as MentorMessage[],
      };
    }),
  );
  return body.items;
}

export async function getConversation(id: string): Promise<MentorConversation> {
  return request(`/intern/me/ai-mentor/conversations/${encodeURIComponent(id)}`, parseConversation);
}

export async function sendMentorMessage(
  id: string,
  content: string,
): Promise<{ reply: string; conversation: MentorConversation }> {
  return request(
    `/intern/me/ai-mentor/conversations/${encodeURIComponent(id)}/messages`,
    (value) => {
      const v = record(value);
      return { reply: string(v.reply), conversation: parseConversation(v.conversation) };
    },
    { method: "POST", body: { content } },
  );
}

export async function createConversation(title: string): Promise<MentorConversation> {
  return request("/intern/me/ai-mentor/conversations", parseConversation, {
    method: "POST",
    body: { title },
  });
}

export async function archiveConversation(id: string): Promise<MentorConversation> {
  return request(
    `/intern/me/ai-mentor/conversations/${encodeURIComponent(id)}/archive`,
    parseConversation,
    { method: "POST" },
  );
}
