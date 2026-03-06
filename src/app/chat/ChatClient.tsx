"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { sendMessage, type Message } from "@/data/chat";

export function ChatClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const sendMutation = useMutation({
    mutationFn: ({ prompt, messages }: { prompt: string; messages: Message[] }) =>
      sendMessage({ prompt, messages }),
    onSuccess: (data, { prompt }) => {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.content || "(empty response)" },
      ]);
    },
    onError: (err, { prompt }) => {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
        },
      ]);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send() {
    if (!input.trim() || sendMutation.isPending) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages((m) => [...m, userMessage]);
    setInput("");
    sendMutation.mutate({ prompt: userMessage.content, messages });
  }

  const loading = sendMutation.isPending;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex-1 space-y-4 overflow-y-auto">
        {messages.length === 0 && (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500">
            Ask questions about your PDFs. The AI has access to the text extracted
            from files you&apos;ve uploaded. Try: &quot;Summarize my documents&quot;
            or &quot;What are the main points?&quot;
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={
              msg.role === "user"
                ? "ml-auto max-w-[85%] rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white"
                : "rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-800"
            }
          >
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}

        {loading && (
          <div className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-500">
            Thinking...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your PDFs..."
          disabled={loading}
          className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none ring-0 focus:border-zinc-400"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
