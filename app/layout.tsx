import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Footer from "./api/components/footer";
import Header from "./api/components/header";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Authentica - Verifiable AI Art Framework",
  description: "Blockchain-based proof of authorship for AI-generated content",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Header />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
