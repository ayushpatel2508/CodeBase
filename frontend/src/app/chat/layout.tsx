import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatSidebar } from "@/components/chat/chat-sidebar";

import { SidebarProvider } from "@/context/sidebar-context";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <SidebarProvider>
      <div className="flex flex-col h-[100dvh] bg-[#fafafa] text-neutral-900 font-sans overflow-hidden">
        <ChatHeader />
        <div className="flex flex-1 overflow-hidden relative">
          <ChatSidebar session={session} />
          <main className="flex-1 flex flex-col min-w-0 bg-[#fafafa]">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
