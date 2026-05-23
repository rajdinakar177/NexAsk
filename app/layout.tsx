import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import Header from "./components/Header";
import Footer from "./components/Footer";
import getOrCreateDB from "./models/server/dbSetup";
import getOrCreateStorage from "./models/server/storage.collection";
import { Suspense } from "react";
import PageLoader from "./components/PageLoader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NexAsk — Q&A for Developers",
  description: "A community-driven Q&A platform for developers",
};

// Initialize DB + storage once at startup (server-side only)
await Promise.all([getOrCreateDB(), getOrCreateStorage()]);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={cn(inter.className, "min-h-screen dark:bg-black dark:text-white")}>
        <Suspense>
          <PageLoader />
        </Suspense>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}