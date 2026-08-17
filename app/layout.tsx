import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GAnalyst",
  description: "Ask your Google Analytics data questions in plain English",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
