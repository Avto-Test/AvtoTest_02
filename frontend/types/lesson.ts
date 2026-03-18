export interface LessonItem {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  content_url: string;
  thumbnail_url: string | null;
  topic: string | null;
  section: string | null;
  is_premium: boolean;
  sort_order: number;
  created_at: string;
}

export interface LessonSection {
  key: string;
  title: string;
  lessons: LessonItem[];
}

export interface LessonsFeedResponse {
  is_premium_user: boolean;
  lessons: LessonItem[];
  sections: LessonSection[];
}
