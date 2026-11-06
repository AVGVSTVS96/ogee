import "./globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { serverUrl } from "@/lib/site.ts";

const sans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = { metadataBase: new URL(serverUrl) };

const Layout = ({ children }: { children: ReactNode }) => (
  <html className={`${sans.variable} ${mono.variable}`} lang="en">
    <body>{children}</body>
  </html>
);

export default Layout;
