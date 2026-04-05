import { Sidebar } from "@/components/sidebar"
import { TopNavbar } from "@/components/top-navbar"
import { SimulationContent } from "@/components/simulation-content"

export default function SimulationPage() {
  // Toggle this to see locked vs unlocked state
  const isSimulationLocked = false

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Sidebar */}
      <Sidebar activeItem="simulyatsiya" />
      
      {/* Top Navbar */}
      <TopNavbar 
        xp={307}
        coins={90}
        seriva={1}
        level={6}
      />
      
      {/* Main Content Area */}
      <main className="ml-56 pt-16">
        <SimulationContent 
          isLocked={isSimulationLocked}
          readinessPercentage={70}
          passProbability={61}
          cooldownDays={14}
          coinCost={120}
          cooldownCoinCost={40}
          nextLevelXp={143}
        />
      </main>
    </div>
  )
}
