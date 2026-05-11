import type { ReactNode } from "react";
import { JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import { StudioShell } from "@/components/contentStudio/StudioShell";
import "../studio.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const sourceSerif4 = Source_Serif_4({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-source-serif",
  display: "swap",
});

export default function ContentStudioLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${jetbrainsMono.variable} ${sourceSerif4.variable}`}>
      <StudioShell>{children}</StudioShell>
    </div>
  );
}
