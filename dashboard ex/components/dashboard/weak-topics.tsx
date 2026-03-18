"use client"

import { AlertTriangle, FileText, Car, Users, MapPin, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

interface TopicRowProps {
  icon: React.ElementType
  name: string
  percentage: number
  isHighlighted?: boolean
  questionCount?: number
}

function TopicRow({ icon: Icon, name, percentage, isHighlighted, questionCount }: TopicRowProps) {
  const progressColor = percentage >= 80 ? "bg-emerald-500" : percentage >= 70 ? "bg-emerald-500" : "bg-emerald-500"
  
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-colors group">
      <div className={`size-10 rounded-lg flex items-center justify-center ${isHighlighted ? 'bg-orange-500/20' : 'bg-white/10'}`}>
        <Icon className={`size-5 ${isHighlighted ? 'text-orange-400' : 'text-muted-foreground'}`} />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{name}</p>
        <div className="mt-2 flex items-center gap-3">
          <Progress value={percentage} className="flex-1 h-2 bg-white/10" />
        </div>
      </div>

      <span className="text-sm font-semibold text-muted-foreground w-12 text-right">{percentage}%</span>

      <Button 
        size="sm"
        className={`${
          isHighlighted 
            ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
            : 'bg-transparent hover:bg-white/10 text-muted-foreground border border-white/20 hover:text-foreground'
        } font-medium`}
      >
        <ArrowRight className="size-4 mr-1.5" />
        {questionCount ? `${questionCount} savol mashq` : 'Mashq qilish'}
      </Button>
    </div>
  )
}

export function WeakTopics() {
  const topics = [
    { icon: AlertTriangle, name: "Chorrahalar", percentage: 65, isHighlighted: true, questionCount: 5 },
    { icon: FileText, name: "Yo'l harakati qoidalari", percentage: 80 },
    { icon: Car, name: "Haydovchi madaniyati", percentage: 72 },
    { icon: MapPin, name: "Yo'l chiziqlari", percentage: 69 },
  ]

  return (
    <div className="rounded-2xl bg-card border border-border p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">Zaif mavzular</h3>
        <p className="text-sm text-muted-foreground">
          Hozri eng, kory o&apos;tibor talabxytarnahadil mavzular.
        </p>
      </div>

      <div className="space-y-3">
        {topics.map((topic) => (
          <TopicRow key={topic.name} {...topic} />
        ))}
      </div>
    </div>
  )
}
