import type { UserRole } from '@muslim-tech/types';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}
