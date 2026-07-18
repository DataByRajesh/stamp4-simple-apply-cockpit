'use client'
import { FormEvent, useState } from 'react'
export default function Stamp4LoginPage() {
  const [error,setError]=useState(''); const [busy,setBusy]=useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(''); const form=new FormData(event.currentTarget); const response=await fetch('/api/stamp4/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:form.get('password')})}); if(response.ok) window.location.assign('/stamp4/simple-apply'); else {setError('Incorrect access password.');setBusy(false)} }
  return <main className="shell auth-shell"><section className="panel auth-panel stack"><div className="top-nav-brand"><span aria-hidden="true">S4</span><strong>Simple Apply</strong></div><div><p className="eyebrow">Private workspace</p><h1>Welcome back</h1><p className="muted">Enter your Stamp4 access password to open the cockpit.</p></div><form className="stack" onSubmit={submit}><label className="stack compact-stack"><span className="eyebrow">Access password</span><input className="input" name="password" type="password" autoComplete="current-password" required autoFocus /></label><button className="button" disabled={busy}>{busy?'Signing in…':'Open cockpit'}</button>{error&&<p className="notice error" role="alert">{error}</p>}</form></section></main>
}
