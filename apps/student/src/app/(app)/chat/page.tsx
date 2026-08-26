import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { ChatThread } from "./chat-thread";

export const metadata: Metadata = {
  title: "التواصل مع الإدارة — Muslim Tech",
};

export default function ChatPage() {
  return (
    <div>
      <PageHeader title="التواصل مع الإدارة" />
      <ChatThread />
    </div>
  );
}
