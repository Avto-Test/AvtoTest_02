import * as React from "react"
import { cn } from "@/lib/utils"

interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
    label: string
    value: string | number
    description?: string
    icon?: React.ReactNode
    trend?: {
        value: string | number
        label?: string
        variant?: "success" | "destructive" | "warning" | "neutral"
    }
}

const Stat = React.forwardRef<HTMLDivElement, StatProps>(
    ({ className, label, value, description, icon, trend, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg dark:border-slate-700 dark:bg-slate-800",
                    className
                )}
                {...props}
            >
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                            {label}
                        </p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                {value}
                            </h3>
                            {trend && (
                                <span
                                    className={cn(
                                        "text-xs font-semibold",
                                        trend.variant === "success" && "text-emerald-600 dark:text-emerald-400",
                                        trend.variant === "destructive" && "text-red-600 dark:text-red-400",
                                        trend.variant === "warning" && "text-amber-600 dark:text-amber-400",
                                        trend.variant === "neutral" && "text-slate-600 dark:text-slate-400",
                                        !trend.variant && "text-emerald-600 dark:text-emerald-400"
                                    )}
                                >
                                    {trend.value}
                                </span>
                            )}
                        </div>
                        {(description || (trend && trend.label)) && (
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                {description || trend?.label}
                            </p>
                        )}
                    </div>
                    {icon && (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800/50 dark:text-slate-300">
                            {icon}
                        </div>
                    )}
                </div>
            </div>
        )
    }
)
Stat.displayName = "Stat"

export { Stat }
