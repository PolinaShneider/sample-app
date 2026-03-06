import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnv } from "@/server/env";
import { getServerSession } from "@/server/auth";
import { getSql } from "@/server/db";

export const runtime = "nodejs";

const MAX_CONTEXT_CHARS = 100_000;

const requestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional(),
});

type OpenAIChatResponse = {
  choices?: { message?: { content?: string | null } | null }[];
  error?: { message?: string; type?: string; code?: number } | string;
};

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { prompt, messages } = parsed.data;

  const env = getEnv();

  let contextText = "";
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT ftc.extracted_text
      FROM file_text_content ftc
      JOIN files f ON f.id = ftc.file_id
      WHERE f.user_id = ${session.user.id}
    `;
    contextText = rows
      .map((r) => (r.extracted_text as string) ?? "")
      .join("\n\n---\n\n");
    if (contextText.length > MAX_CONTEXT_CHARS) {
      contextText = contextText.slice(0, MAX_CONTEXT_CHARS) + "\n\n[Truncated...]";
    }
  } catch (error) {
    console.error("Error loading file context:", error);
  }

  const systemContent = contextText
    ? `You are a helpful assistant. The user has uploaded PDF documents. Here is the extracted text from their files for context:\n\n${contextText}\n\nAnswer the user's questions based on this content when relevant.`
    : "You are a helpful assistant. The user has not yet uploaded any PDFs. You can answer general questions, but for PDF-specific questions, suggest they upload documents first.";

  const openAiMessages: { role: "user" | "assistant" | "system"; content: string }[] = [
    { role: "system", content: systemContent },
  ];

  if (messages?.length) {
    for (const m of messages) {
      openAiMessages.push({ role: m.role, content: m.content });
    }
  }
  openAiMessages.push({ role: "user", content: prompt });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.LLM_MODEL,
        messages: openAiMessages,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      let errorBody: OpenAIChatResponse | undefined;
      try {
        errorBody = (await response.json()) as OpenAIChatResponse;
      } catch {
        // ignore parse errors
      }

      return NextResponse.json(
        {
          error: "LLM request failed",
          details: errorBody?.error ?? { status: response.status },
        },
        { status: response.status },
      );
    }

    const data = (await response.json()) as OpenAIChatResponse;
    const content = data.choices?.[0]?.message?.content ?? "";

    return NextResponse.json({ content });
  } catch (error) {
    clearTimeout(timeout);

    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "LLM request timed out" },
        { status: 504 },
      );
    }

    console.error("Error calling OpenAI", error);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}
