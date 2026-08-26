import type {
  LectureStatus,
  NotificationAudience,
  NotificationType,
  UserRole,
  UserStatus,
} from "./enums.js";

export interface User {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface Subject {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  order: number;
  isPublished: boolean;
  lectureCount?: number;
  progressPercent?: number;
}

export interface Chapter {
  id: string;
  subjectId: string;
  title: string;
  order: number;
}

export interface Lecture {
  id: string;
  chapterId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  videoAssetId: string | null;
  number: number;
  status: LectureStatus;
  publishAt: string | null;
}

export interface LectureFile {
  id: string;
  lectureId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  isDownloadable: boolean;
  order: number;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  linkUrl: string | null;
  publishAt: string;
  expiresAt: string | null;
  isActive: boolean;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  audience: NotificationAudience;
  deepLink: string | null;
  createdAt: string;
  isRead: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
