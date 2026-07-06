import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Stamp4 Simple Apply Cockpit',
  description: 'Private permit-aware job-fit cockpit for Raj',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  )
}
