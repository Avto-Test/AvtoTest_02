"use client"

import { useState } from "react"
import { Sidebar } from "@/components/autotest/sidebar"
import { TopBar } from "@/components/autotest/top-bar"
import { QuestionPanel } from "@/components/autotest/question-panel"
import { ImagePanel } from "@/components/autotest/image-panel"
import { AICoach } from "@/components/autotest/ai-coach"
import { RewardBanner } from "@/components/autotest/reward-banner"

// Sample data
const sampleQuestion = {
  number: 7,
  text: "Tezlikni tanlashda asosiy mezon nima?",
  answers: [
    { id: "a", text: "Faqat avtomobil quvvatiga suyanish" },
    { id: "b", text: "Belgilangan limit va real ko'rinish sharoitiga mos xavfsiz tezlik hamda masofani tanlash" },
    { id: "c", text: "Oldingi mashina tezligini kor ko'rona takrorlash" },
    { id: "d", text: "Yo'l bo'sh bo'lsa limitni ikki marta oshish" },
  ],
  correctAnswer: "b",
}

export default function PracticePage() {
  const [currentQuestion, setCurrentQuestion] = useState(3)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>("b")
  const [isAnswered, setIsAnswered] = useState(true)
  const [showReward, setShowReward] = useState(true)

  // Track answered questions
  const [answeredQuestions] = useState<Map<number, "correct" | "wrong" | "unanswered">>(
    new Map([
      [1, "correct"],
      [2, "correct"],
      [3, "correct"],
    ])
  )

  const handleAnswerSelect = (answerId: string) => {
    if (!isAnswered) {
      setSelectedAnswer(answerId)
      setIsAnswered(true)
      setShowReward(true)
    }
  }

  const handleContinue = () => {
    // Move to next question
    if (currentQuestion < 16) {
      setCurrentQuestion(currentQuestion + 1)
      setSelectedAnswer(null)
      setIsAnswered(false)
      setShowReward(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background with gradient and subtle pattern */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.08),transparent_50%)]" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.06),transparent_50%)]" />
      
      {/* Subtle grid pattern */}
      <div className="fixed inset-0 opacity-[0.02]" style={{
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(255 255 255 / 0.1)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e")`
      }} />

      {/* Content */}
      <div className="relative z-10">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <div className="pl-56">
          {/* Top Bar */}
          <TopBar
            currentQuestion={currentQuestion}
            totalQuestions={16}
            answeredQuestions={answeredQuestions}
            timeRemaining="20.42"
            onQuestionSelect={setCurrentQuestion}
          />

          {/* Content Area */}
          <main className="p-6">
            {/* Reward Banner */}
            <div className="mb-6 flex justify-center">
              <RewardBanner xp={10} coins={2} show={showReward} />
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left Column - Question Panel */}
              <div className="lg:col-span-3 space-y-6">
                <QuestionPanel
                  questionNumber={sampleQuestion.number}
                  questionText={sampleQuestion.text}
                  answers={sampleQuestion.answers}
                  selectedAnswer={selectedAnswer}
                  correctAnswer={sampleQuestion.correctAnswer}
                  isLocked={isAnswered}
                  onAnswerSelect={handleAnswerSelect}
                />

                {/* AI Coach Section */}
                {isAnswered && selectedAnswer === sampleQuestion.correctAnswer && (
                  <AICoach
                    isCorrect={true}
                    feedbackMessage="Good job!"
                    explanation="The safe speed choice always depends on visibility conditions. In rain, increase your following distance to allow for longer stopping distance and reduce the risk of h..."
                    xpReward={10}
                    coinsReward={2}
                    onContinue={handleContinue}
                  />
                )}
              </div>

              {/* Right Column - Image Panel */}
              <div className="lg:col-span-2">
                <ImagePanel
                  imageSrc="/images/rainy-driving.jpg"
                  tipTitle="Xavfsiz haydash"
                  tipText="Tezyurar tezlikda, ayniqsa yomg'irli havoda oralirq masofangizm oshiring. Ko'rishni oshiring"
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
