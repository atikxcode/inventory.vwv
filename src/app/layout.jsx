// src/app/layout.jsx (POS project)
'use client'

import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import Providers from "../../components/Provider"
import { BranchProvider } from "@/contexts/BranchContext"


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <BranchProvider>
        {children}
        </BranchProvider>
        </Providers>
         
        
      </body>
    </html>
  )
}
