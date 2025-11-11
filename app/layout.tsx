// layout.tsx provides the root HTML structure and metadata bindings for hazo_connect.
import type { Metadata } from "next";
import React from "react";
import "./globals.css";

// site_metadata declares default page metadata for the component library shell.
export const metadata: Metadata = {
  title: "hazo_connect component library",
  description: "Reusable UI building blocks for database connectivity flows."
};

// RootLayout wraps all routes with consistent HTML scaffolding and styling hooks.
export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="cls_body_layout min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}

