import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import AuthSessionWatcher from "@/app/components/auth-session-watcher";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Clube das Jovens Senhoras",
  description:
    "Clube criativo para transformar o hobby em um ritual delicado no dia a dia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${cormorant.variable} ${manrope.variable}`}>
      <body>
        <AuthSessionWatcher />
        {children}
      </body>
    </html>
  );
}
