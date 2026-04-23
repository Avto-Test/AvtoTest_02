"use client"

interface ImagePanelProps {
  imageSrc: string
  tipTitle: string
  tipText: string
}

export function ImagePanel({ imageSrc, tipTitle, tipText }: ImagePanelProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Scenario Image */}
      <div className="relative overflow-hidden rounded-2xl shadow-2xl shadow-black/40">
        {/* Image */}
        <img
          src={imageSrc}
          alt="Driving scenario"
          className="w-full h-64 object-cover"
        />
        
        {/* Cinematic gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
        
        {/* Vignette effect */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.4)_100%)]" />
        
        {/* Top subtle gradient */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/30 to-transparent" />
        
        {/* Lesson Tip Badge */}
        <div className="absolute top-4 left-4">
          <span className="inline-flex items-center rounded-full bg-emerald-500/20 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Lesson tip
          </span>
        </div>
      </div>

      {/* Tip Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-white/[0.08] p-5 shadow-xl shadow-black/20">
        {/* Subtle glow */}
        <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />
        
        <h3 className="relative text-lg font-semibold text-white mb-2 tracking-tight">{tipTitle}</h3>
        <p className="relative text-sm text-slate-400 leading-relaxed">
          {tipText}
        </p>
      </div>
    </div>
  )
}
