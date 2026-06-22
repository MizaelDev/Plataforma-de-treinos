import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Academia Platform",
  description: "Gestao de academia, personal trainer e artes marciais"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
