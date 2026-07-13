import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600"],
});
const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://train.dogcaregh.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: "DogTrainerGH — Managed Dog Training in Ghana",
    template: "%s | DogTrainerGH",
  },
  description:
    "Book vetted dog trainers in Ghana. Paid evaluation, tailored programs, on-platform payments.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#2A1A0F" />
      </head>
      <body className={`${display.variable} ${body.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
