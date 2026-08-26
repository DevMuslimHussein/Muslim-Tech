import type { Metadata } from "next";
import { GradesView } from "./grades-view";

export const metadata: Metadata = {
  title: "درجاتي — Muslim Tech",
};

export default function GradesPage() {
  return <GradesView />;
}
