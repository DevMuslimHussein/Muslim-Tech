import type { Metadata } from "next";
import { CodeLab } from "./code-lab";

export const metadata: Metadata = {
  title: "مختبر الأكواد — Muslim Tech",
};

export default function LabPage() {
  return <CodeLab />;
}
