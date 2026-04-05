"use client"

interface ProgressCircleProps {
  percentage: number
  passChance?: number
}

export function ProgressCircle({
  percentage,
  passChance = 61,
}: ProgressCircleProps) {
  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Radial gradient light source BEHIND the ring - creates natural light falloff */}
      <div 
        className="absolute pointer-events-none"
        style={{
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(255,200,0,0.25) 0%, rgba(255,180,0,0.12) 30%, rgba(34,197,94,0.06) 50%, transparent 70%)',
          filter: 'blur(20px)',
          transform: 'translate(-50%, -50%)',
          left: '50%',
          top: '50%',
        }}
      />
      
      {/* Secondary softer glow for depth */}
      <div 
        className="absolute pointer-events-none"
        style={{
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(250,204,21,0.18) 0%, rgba(34,197,94,0.08) 40%, transparent 65%)',
          filter: 'blur(30px)',
          transform: 'translate(-50%, -50%)',
          left: '50%',
          top: '50%',
        }}
      />

      {/* Ring Image with screen blend mode and slight blur for soft bloom */}
      <img
        src="/progress-ring-glow.png"
        alt=""
        className="w-[320px] h-[320px] object-contain relative"
        style={{
          mixBlendMode: 'screen',
          opacity: 0.92,
          filter: 'blur(0.5px) brightness(1.1)',
        }}
      />
      
      {/* Center text overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10">
        <span className="text-base text-gray-400 tracking-wide">
          Tayyorlik
        </span>
        <span 
          className="font-bold text-white leading-none my-1"
          style={{ fontSize: '4.5rem' }}
        >
          {percentage}%
        </span>
        <span className="text-sm text-gray-400">
          O{"'"}tish ehtimoli <span className="font-semibold text-white">{passChance}%</span>
        </span>
      </div>
    </div>
  )
}
