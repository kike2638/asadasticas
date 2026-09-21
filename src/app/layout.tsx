import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ASADAS ERP",
  description: "Sistema de gestión para Administradoras de Agua",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
