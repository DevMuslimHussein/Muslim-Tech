import type { Metadata } from "next";
import { NotesManager } from "./notes-manager";

export const metadata: Metadata = {
  title: "ملاحظاتي — Muslim Tech",
};

export default function NotesPage() {
  return <NotesManager />;
}
