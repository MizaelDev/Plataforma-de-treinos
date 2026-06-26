import type { Metadata } from "next";
import { appConfig } from "@/lib/app-config";
import "./globals.css";

export const metadata: Metadata = {
  title: appConfig.name,
  description: "Sistema de gestão para academias, personal trainers e artes marciais",
  icons: {
    icon: appConfig.logoUrl,
    apple: appConfig.logoUrl
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
