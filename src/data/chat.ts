export type Message = { role: "user" | "assistant"; content: string };

export type SendMessageParams = {
  prompt: string;
  messages?: Message[];
};

export type SendMessageResult = {
  content: string;
};

export async function sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Something went wrong");
  }
  return data;
}
