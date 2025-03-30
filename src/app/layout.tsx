import type { Metadata } from "next";
import { Inter, Outfit, Poltawski_Nowy } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const poltawskiNowy = Poltawski_Nowy({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poltawski-nowy",
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
      <body className={`${inter.variable} ${outfit.variable} ${poltawskiNowy.variable} font-sans antialiased`}>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
