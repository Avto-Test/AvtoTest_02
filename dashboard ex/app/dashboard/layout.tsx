"use client"

import { Sidebar } from "@/components/dashboard/sidebar"
import { TopBar } from "@/components/dashboard/top-bar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-60 transition-all duration-300">
        <TopBar />
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
