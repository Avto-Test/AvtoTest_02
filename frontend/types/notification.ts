export interface Notification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  payload: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}
