export const UserRole = {
  STUDENT: "student",
  ADMIN: "admin",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  ACTIVE: "active",
  SUSPENDED: "suspended",
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const LectureStatus = {
  DRAFT: "draft",
  SCHEDULED: "scheduled",
  PUBLISHED: "published",
} as const;
export type LectureStatus = (typeof LectureStatus)[keyof typeof LectureStatus];

export const NotificationType = {
  LECTURE: "lecture",
  ANNOUNCEMENT: "announcement",
  FILE: "file",
  SYSTEM: "system",
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const NotificationAudience = {
  ALL: "all",
  GROUP: "group",
  USER: "user",
} as const;
export type NotificationAudience = (typeof NotificationAudience)[keyof typeof NotificationAudience];
