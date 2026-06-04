import { Exclude } from 'class-transformer';
import { User, UserRole, AuthProvider } from '@prisma/client';

export class UserEntity implements User {
  id: string;
  email: string;

  @Exclude()
  password_hash: string | null;

  name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_verified: boolean;
  is_active: boolean;
  provider: AuthProvider;
  provider_id: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
