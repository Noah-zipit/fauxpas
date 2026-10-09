import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "fauxpas — will they love you or cancel you?",
  description:
    "Cultural-fit intelligence for brands: scan a new market with the Qloo taste graph and get a love/cancel verdict before you launch and embarrass yourself.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
