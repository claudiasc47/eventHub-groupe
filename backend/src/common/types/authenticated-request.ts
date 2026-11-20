import { Request } from 'express';
import { UserRole } from '../../users/user.entity';

export interface AuthUser {
  id: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}
