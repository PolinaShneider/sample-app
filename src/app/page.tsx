import { redirect } from "next/navigation";
import { getServerSession } from "@/server/auth";
import { SignInButton } from "@/components/SignInButton";

export default async function HomePage() {
  const session = await getServerSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4">
      <main className="mx-auto w-full max-w-md space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            AI File Assistant
          </h1>
          <p className="text-zinc-400">
            Upload PDFs, share with others, and chat with AI over your documents.
          </p>
        </div>

        <SignInButton />
      </main>
    </div>
  );
}
