'use client';

import { RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { AnswerOption as IAnswerOption } from '@/schemas/test.schema';

interface AnswerOptionProps {
    option: IAnswerOption;
    selected: boolean;
    onSelect: (optionId: string) => void;
    disabled?: boolean;
}

export function AnswerOption({ option, selected, onSelect, disabled }: AnswerOptionProps) {
    const displayText = option.text.trim().replace(/\/t\s*$/i, "").trim();

    return (
        <div
            className={cn(
                "relative flex items-center space-x-2 rounded-lg border p-4 cursor-pointer transition-all hover:bg-muted/50",
                selected && "border-primary bg-primary/5 hover:bg-primary/10",
                disabled && "cursor-not-allowed opacity-70 hover:bg-transparent"
            )}
            onClick={() => !disabled && onSelect(option.id)}
        >
            <RadioGroupItem value={option.id} id={option.id} disabled={disabled} />
            <Label
                htmlFor={option.id}
                className="flex-grow cursor-pointer font-normal"
            >
                {displayText}
            </Label>
        </div>
    );
}
