import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { ChatConsole } from "./chat-console";

export const metadata: Metadata = {
  title: "المحادثات — إدارة المنصة",
};

export default function ChatPage() {
  return (
    <div>
      <PageHeader
        title="محادثات الطلاب"
        subtitle="ردّ على استفسارات الطلاب مباشرة"
      />
      <ChatConsole />
    </div>
  );
}
