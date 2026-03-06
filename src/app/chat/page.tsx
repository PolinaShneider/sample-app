import { redirect } from "next/navigation";
import { getServerSession } from "@/server/auth";
import { SignOutButton } from "@/components/SignOutButton";
import { ChatClient } from "./ChatClient";

export default async function ChatPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <h1 className="text-lg font-semibold text-zinc-900">AI Chat</h1>
          <div className="flex items-center gap-4">
            <a
              href="/dashboard"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
            >
              Dashboard
            </a>
            <span className="text-sm text-zinc-500">{session.user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto flex flex-1 flex-col max-w-3xl w-full px-4 py-6">
        <ChatClient />
      </main>
    </div>
  );
}
