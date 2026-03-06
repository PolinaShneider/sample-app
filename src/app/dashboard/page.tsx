import { redirect } from "next/navigation";
import { getServerSession } from "@/server/auth";
import { SignOutButton } from "@/components/SignOutButton";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <h1 className="text-lg font-semibold text-zinc-900">
            AI File Assistant
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-600">{session.user.email}</span>
            <SignOutButton />
            <a
              href="/chat"
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Chat
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <DashboardClient />
      </main>
    </div>
  );
}
