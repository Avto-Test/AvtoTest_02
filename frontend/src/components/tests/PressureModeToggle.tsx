
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";

interface PressureModeToggleProps {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    disabled?: boolean;
}

export function PressureModeToggle({ enabled, onChange, disabled }: PressureModeToggleProps) {
    return (
        <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-100 rounded-lg group transition-all hover:bg-orange-100/50">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <Label htmlFor="pressure-mode" className="text-sm font-bold text-orange-900 cursor-pointer">
                        Simulate Real Exam Pressure
                    </Label>
                    <div className="relative group/tooltip">
                        <Info className="w-4 h-4 text-orange-500 cursor-help" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-10">
                            Enabling this reduces the allowed time by 20%,
                            stricter scoring (max 1 mistake), and applies a 0.85x score modifier.
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
                        </div>
                    </div>
                </div>
                <p className="text-xs text-orange-700">
                    Stricter timer and scoring for professional training.
                </p>
            </div>
            <div className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 bg-slate-200">
                <input
                    type="checkbox"
                    id="pressure-mode"
                    className="sr-only"
                    checked={enabled}
                    onChange={(e) => onChange(e.target.checked)}
                    disabled={disabled}
                />
                <div
                    className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${enabled ? 'translate-x-5 bg-orange-500' : 'translate-x-0'}`}
                />
            </div>
        </div>
    );
}
