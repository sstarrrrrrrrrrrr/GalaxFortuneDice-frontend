import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "银河大乐骰",
  description: "Galaxy Fortune Dice",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
