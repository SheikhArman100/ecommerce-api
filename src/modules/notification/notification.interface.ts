import { NotificationType } from '../../generated/client';

export interface INotification {
  id: number;
  title: string;
  body: string;
  type: NotificationType;
  isRead: boolean;
  link: string | null;
  image: string | null;
  userId: number | null;
  createdAt: Date;
  updatedAt: Date;
  user?: { id: number; name: string; email: string } | null;
}

export interface INotificationCreate {
  title: string;
  body: string;
  type?: NotificationType;
  link?: string | null;
  image?: string | null;
}

export interface INotificationFilters {
  searchTerm?: string;
  type?: string;
  isRead?: string;
  userId?: string;
}