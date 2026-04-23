"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Clock, MoreHorizontal } from "lucide-react"

export default function SimulationExam() {
  const [currentQuestion] = useState(22)
  const totalQuestions = 40
  const answeredQuestions = 22

  const questionNumbers = Array.from({ length: 24 }, (_, i) => i + 1)

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Simulation</span>
          </button>
          <ChevronRight className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium">Simulyatsion imtihon</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-gray-300">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">26:58</span>
          </div>
          <button className="bg-[#1a7a4c] hover:bg-[#1a8a55] text-white text-sm font-medium px-5 py-2 rounded-full transition-colors">
            Yakunlash
          </button>
          <button className="text-gray-400 hover:text-white transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Question Navigation Strip */}
      <div className="px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Savol</span>
            <span className="text-white font-semibold">{currentQuestion}</span>
            <span className="text-gray-500">/ {totalQuestions}</span>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto flex-1 scrollbar-hide">
            {questionNumbers.map((num) => (
              <button
                key={num}
                className={`min-w-[32px] h-8 flex items-center justify-center text-sm rounded transition-colors ${
                  num === 10
                    ? "text-[#4ade80]"
                    : num <= answeredQuestions
                    ? "text-gray-300"
                    : "text-gray-500"
                }`}
              >
                {num}
              </button>
            ))}
            <button className="min-w-[32px] h-8 flex items-center justify-center text-gray-500">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="mt-3 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#4ade80] rounded-full"
            style={{ width: `${(answeredQuestions / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-start justify-center px-6 py-6">
        <div className="w-full max-w-[1100px] bg-[#141414] border border-white/10 rounded-2xl overflow-hidden">
          {/* Question Header */}
          <div className="px-6 pt-5 pb-4 border-b border-white/5">
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
              <span>Savol</span>
              <span className="text-white font-semibold">{currentQuestion}</span>
              <span>/ {totalQuestions}</span>
              <span className="ml-2 text-gray-500">javoblangan</span>
            </div>
            <div className="h-1 w-24 bg-[#4ade80] rounded-full" />
          </div>

          {/* Question Content */}
          <div className="p-6">
            <h2 className="text-lg font-medium mb-6 leading-relaxed">
              ko'p qatotli magistralda demo-vaziyat 1: Uzluksiz chiziq oldida qaysi harakat to'gri?
            </h2>

            <div className="flex gap-6">
              {/* Image */}
              <div className="flex-shrink-0 w-[520px]">
                <img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%20Mar%2018%2C%202026%2C%2004_02_55%20PM-5midw6RK1Enf4Hq1OLX4yNlylNVnBN.png"
                  alt="Traffic scenario"
                  className="w-full h-[280px] object-cover object-[center_60%] rounded-lg"
                />
              </div>

              {/* Answer Options */}
              <div className="flex-1 flex flex-col gap-3">
                {[
                  { letter: "A", text: "Chap tomonga emas, to'gri harakat qilish" },
                  { letter: "B", text: "Uzluksiz chiziqdan chapga manevr qilish" },
                  { letter: "C", text: "Uzluksiz chiziqdan o'ngga manevr qilish" },
                  { letter: "D", text: "Uzluksiz chiziqdan orqaga qaytish" },
                ].map((option) => (
                  <button
                    key={option.letter}
                    className="flex items-center gap-4 p-4 bg-[#1c1c1c] hover:bg-[#252525] border border-white/5 rounded-xl transition-colors text-left"
                  >
                    <span className="text-gray-400 font-medium">{option.letter}</span>
                    <span className="text-gray-200 text-sm">{option.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-[#1c1c1c] hover:bg-[#252525] border border-white/10 rounded-full transition-colors">
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">Oldingi</span>
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-[#1a7a4c] hover:bg-[#1a8a55] rounded-full transition-colors">
              <span className="text-sm font-medium">Keyingi</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
