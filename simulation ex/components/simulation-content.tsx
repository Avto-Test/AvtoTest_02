"use client"

import { useState } from "react"
import { Check, Rocket, Coins, Lock, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProgressCircle } from "@/components/progress-circle"

interface SimulationContentProps {
  isLocked?: boolean
  readinessPercentage?: number
  passProbability?: number
  cooldownDays?: number
  coinCost?: number
  cooldownCoinCost?: number
  nextLevelXp?: number
}

export function SimulationContent({
  isLocked = false,
  readinessPercentage = 70,
  passProbability = 61,
  cooldownDays = 14,
  coinCost = 120,
  cooldownCoinCost = 40,
  nextLevelXp = 143,
}: SimulationContentProps) {
  const [selectedOption, setSelectedOption] = useState<"learning" | "coins">("learning")

  return (
    <div className="h-[calc(100vh-64px)] relative overflow-hidden flex flex-col">
      {/* Road Background Image with Built-in Lighting */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url('/road-light-bg.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
        }}
      />
      
      {/* Light Dark Overlay - rgba(0,0,0,0.35) max */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.35) 100%)',
        }}
      />
      
      <div className="relative flex-1 p-4 lg:p-5 max-w-7xl mx-auto w-full flex flex-col">
        {/* Next Level Badge */}
        <div className="absolute top-4 right-4 lg:right-5 text-right z-10">
          <p className="text-xs text-gray-500">Keyingi level</p>
          <p className="text-white font-bold text-sm">{nextLevelXp} XP</p>
        </div>

        {/* Hero Section */}
        <div className="flex items-center justify-between gap-8 pt-2 pb-3 flex-shrink-0">
          {/* Left Side */}
          <div className="space-y-3 max-w-md">
            <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight">
              Simulyatsiya
            </h1>

            <div className="flex items-center gap-2">
              {!isLocked ? (
                <>
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_10px_rgba(34,197,94,0.5)]">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-gray-300 text-sm">Simulyatsiya ochiq va tayyor</span>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Lock className="w-3 h-3 text-amber-400" />
                  </div>
                  <span className="text-gray-300 text-sm">Simulyatsiya yopiq</span>
                </>
              )}
            </div>

            {!isLocked && (
              <button
                className="relative group h-12 px-6 text-base font-semibold text-white rounded-xl transition-all duration-300 overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #22c55e 0%, #14b8a6 50%, #0d9488 100%)',
                  boxShadow: '0 0 30px rgba(34,197,94,0.4), 0 0 60px rgba(34,197,94,0.15), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
              >
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: 'linear-gradient(135deg, #34d399 0%, #2dd4bf 50%, #14b8a6 100%)',
                    boxShadow: '0 0 50px rgba(34,197,94,0.6), 0 0 80px rgba(34,197,94,0.25)',
                  }}
                />
                <span className="relative flex items-center justify-center gap-2">
                  <Rocket className="w-4 h-4" />
                  Simulyatsiyani boshlash
                </span>
              </button>
            )}
          </div>

          {/* Right Side - Progress Circle Image */}
          <div className="flex-shrink-0">
            <ProgressCircle
              percentage={readinessPercentage}
              passChance={passProbability}
            />
          </div>
        </div>

        {/* Cards Section - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0 pb-2">
          {/* Left Card - Tez ochish & Cooldown */}
          <div 
            className="rounded-xl p-4 flex flex-col gap-3"
            style={{
              background: 'rgba(17,17,17,0.85)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(40,40,40,0.6)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}
          >
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Tez ochish</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedOption("learning")}
                  className="w-full p-3 rounded-lg text-left transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.05) 100%)',
                    border: '1px solid rgba(34,197,94,0.35)',
                    boxShadow: selectedOption === "learning" 
                      ? '0 0 16px rgba(34,197,94,0.15), inset 0 0 16px rgba(34,197,94,0.03)' 
                      : 'none',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0"
                      style={{ boxShadow: '0 0 10px rgba(34,197,94,0.4)' }}
                    >
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-white text-sm">Learning Path orqali</span>
                        <span className="text-xs text-gray-500">(tavsiya etiladi)</span>
                      </div>
                      <span className="text-xs text-emerald-400">+ reward ko{"'"}proq!</span>
                    </div>
                  </div>
                </button>

                {!isLocked && (
                  <button
                    onClick={() => setSelectedOption("coins")}
                    className="w-full p-3 rounded-lg text-left transition-all duration-200 flex items-center justify-between hover:bg-[#1a1a1a]"
                    style={{
                      background: 'rgba(20,20,20,0.9)',
                      border: '1px solid rgba(35,35,35,0.8)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <Coins className="w-3 h-3 text-amber-400" />
                      </div>
                      <span className="font-medium text-white text-sm">{coinCost} coin bilan ochish</span>
                    </div>
                    <span className="text-emerald-400 font-semibold text-sm">{coinCost} coin</span>
                  </button>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-800/50">
              <h3 className="text-sm font-semibold text-white mb-2">Cooldown</h3>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-600/30 flex items-center justify-center shrink-0">
                  <Lock className="w-3 h-3 text-gray-400" />
                </div>
                <div>
                  <p className="text-white text-sm">
                    <span className="font-medium">Simulyatsiya hozir ochiq,</span>
                    <span className="text-gray-400"> bkoshlanadi.</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Yana {cooldownDays} kunlik kutish boshlanadi.</p>
                </div>
              </div>

              {isLocked && (
                <Button
                  variant="outline"
                  className="w-full h-9 mt-3 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 rounded-lg text-sm"
                >
                  <Clock className="w-3 h-3 mr-2" />
                  {cooldownCoinCost} coin bilan qisqartirish
                </Button>
              )}
            </div>
          </div>

          {/* Right Card - So'nggi imtihonlar */}
          <div 
            className="rounded-xl p-4 flex flex-col"
            style={{
              background: 'rgba(17,17,17,0.85)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(40,40,40,0.6)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}
          >
            <h3 className="text-sm font-semibold text-white mb-2">So{"'"}nggi imtihonlar</h3>
            
            <div 
              className="flex-1 rounded-lg p-4 flex flex-col items-center justify-center text-center"
              style={{ border: '2px dashed rgba(50,50,50,0.8)' }}
            >
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                style={{
                  background: 'rgba(34,197,94,0.1)',
                  border: '1px solid rgba(34,197,94,0.25)',
                }}
              >
                <AlertCircle className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-white font-medium text-sm mb-1">
                Siz hali simulatsiya ishlamadingiz
              </p>
              <p className="text-xs text-gray-500">
                1 marta sinab ko{"'"}ring — natijalar shu yerda chiqadi.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
