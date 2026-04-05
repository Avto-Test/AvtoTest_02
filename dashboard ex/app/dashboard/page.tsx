import { HeroSection } from "@/components/dashboard/hero-section"
import { AICoach } from "@/components/dashboard/ai-coach"
import { SimulationCard } from "@/components/dashboard/simulation-card"
import { WeakTopics } from "@/components/dashboard/weak-topics"
import { ReadinessCard } from "@/components/dashboard/readiness-card"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Top Row - Hero + Right Sidebar Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* Hero Section */}
        <HeroSection />
        
        {/* Right Sidebar */}
        <div className="flex flex-col gap-4">
          <AICoach />
          <SimulationCard />
        </div>
      </div>

      {/* Bottom Row - Weak Topics + Readiness */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6">
        <WeakTopics />
        <ReadinessCard />
      </div>
    </div>
  )
}
