import { TopNav } from '@/components/stamp4/simple-apply/TopNav'

export default function SimpleApplyLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <TopNav />
      {children}
    </>
  )
}
