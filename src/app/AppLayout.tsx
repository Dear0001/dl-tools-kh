import React from 'react'
import Topbar from './Topbar'

export default function AppLayout({ children }: { children: React.ReactNode }){
  return (
    <div>
      <Topbar />
      <div className="container mx-auto p-4">{children}</div>
    </div>
  )
}
