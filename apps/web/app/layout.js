import "./globals.css";

export const metadata = {
  title: "CarLeads CRM — AI-Powered Lead Management",
  description:
    "Smart CRM for Indian car dealers. AI scores every WhatsApp & Instagram query instantly. Stop wasting time on fake leads.",
  keywords: "car dealer CRM, lead management, WhatsApp CRM, AI lead scoring, car sales India",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full bg-background text-text-primary">
        {children}
      </body>
    </html>
  );
}
