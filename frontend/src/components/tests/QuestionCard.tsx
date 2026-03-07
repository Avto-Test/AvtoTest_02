'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup } from '@/components/ui/radio-group';
import { Question } from '@/schemas/test.schema';
import { AnswerOption } from './AnswerOption';

interface QuestionCardProps {
    question: Question;
    selectedOptionId?: string;
    onSelectOption: (optionId: string) => void;
    isSubmitting?: boolean;
}

const getYouTubeEmbedUrl = (url: string) => {
    try {
        const parsed = new URL(url);
        if (parsed.hostname.includes('youtu.be')) {
            const id = parsed.pathname.replace('/', '');
            return id ? `https://www.youtube.com/embed/${id}` : null;
        }
        if (parsed.hostname.includes('youtube.com')) {
            const id = parsed.searchParams.get('v');
            return id ? `https://www.youtube.com/embed/${id}` : null;
        }
    } catch {
        return null;
    }
    return null;
};

const stripCorrectMarker = (textValue: string) => textValue.trim().replace(/\/t\s*$/i, "").trim();

export function QuestionCard({
    question,
    selectedOptionId,
    onSelectOption,
    isSubmitting
}: QuestionCardProps) {
    const youtubeEmbed = question.video_url ? getYouTubeEmbedUrl(question.video_url) : null;
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="text-lg font-medium leading-relaxed">
                    {question.text}
                </CardTitle>
                {question.image_url && (
                    <div className="mt-4 rounded-lg overflow-hidden border">
                        {/* Using img for now as remote pattern not configured in next.config */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={question.image_url}
                            alt="Question illustration"
                            className="w-full max-h-[400px] object-contain bg-muted"
                        />
                    </div>
                )}
                {question.video_url && (
                    <div className="mt-4 rounded-lg overflow-hidden border bg-black/90">
                        {youtubeEmbed ? (
                            <iframe
                                src={youtubeEmbed}
                                title="Question video"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="w-full aspect-video"
                            />
                        ) : (
                            <video
                                src={question.video_url}
                                controls
                                className="w-full max-h-[400px] object-contain"
                            />
                        )}
                    </div>
                )}
            </CardHeader>
            <CardContent>
                <RadioGroup value={selectedOptionId} className="space-y-3">
                    {question.answer_options.map((option, index) => (
                        <AnswerOption
                            key={option.id}
                            index={index}
                            option={{ ...option, text: stripCorrectMarker(option.text) }}
                            selected={selectedOptionId === option.id}
                            onSelect={onSelectOption}
                            disabled={isSubmitting}
                        />
                    ))}
                </RadioGroup>
            </CardContent>
        </Card>
    );
}
