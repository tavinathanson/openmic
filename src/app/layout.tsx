import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Poltawski_Nowy } from "next/font/google";
import Script from "next/script";
import Image from "next/image";
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
      <head>
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1228947918842988');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <Image
            height={1}
            width={1}
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1228947918842988&ev=PageView&noscript=1"
            alt=""
            priority
          />
        </noscript>
      </head>
      <body className={`${plusJakarta.variable} ${poltawskiNowy.variable} font-sans antialiased`}>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
