import type { Metadata } from "next";
import { SubjectsManager } from "./subjects-manager";

export const metadata: Metadata = {
  title: "المواد — إدارة المنصة",
};

export default function SubjectsPage() {
  return <SubjectsManager />;
}
