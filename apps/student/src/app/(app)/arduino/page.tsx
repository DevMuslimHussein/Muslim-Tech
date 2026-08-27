import type { Metadata } from "next";
import { ArduinoLab } from "./arduino-lab";

export const metadata: Metadata = {
  title: "مختبر أردوينو — Muslim Tech",
};

export default function ArduinoPage() {
  return <ArduinoLab />;
}
