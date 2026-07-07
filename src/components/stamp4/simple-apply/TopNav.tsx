'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/stamp4/simple-apply', label: 'Cockpit' },
  { href: '/stamp4/simple-apply/sources-alerts', label: 'Job Sources & Alerts' },
  { href: '/stamp4/simple-apply/interview-prep', label: 'Interview Prep' },
  { href: '/stamp4/simple-apply/sponsor-companies', label: 'Sponsor Companies' },
  { href: '/stamp4/simple-apply/analytics', label: 'Analytics' },
]

export function TopNav() {
  const pathname = usePathname()

  return (
    <nav className="top-nav">
      <div className="top-nav-inner">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`top-nav-link${pathname === link.href ? ' active' : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
