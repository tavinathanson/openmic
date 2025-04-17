import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Poltawski_Nowy } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const poltawskiNowy = Poltawski_Nowy({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poltawski-nowy",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Crave Laughs Open Mic Sign Up",
  description: "Sign up to perform or watch at our next comedy open mic night!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${plusJakarta.variable} ${poltawskiNowy.variable} font-sans antialiased`}>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
