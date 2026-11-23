import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  PARTICIPANT = 'participant',
  ORGANIZER = 'organizer',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'citext', unique: true })
  email!: string;

  @Column({ name: 'password_hash', select: false })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 30 })
  pseudo!: string;

  @Column({ name: 'first_name', type: 'varchar', nullable: true })
  firstName!: string | null;

  @Column({ name: 'last_name', type: 'varchar', nullable: true })
  lastName!: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone!: string | null;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate!: string | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.PARTICIPANT })
  role!: UserRole;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
  
  @Column({ name: 'email_verified_at', type: 'timestamptz', nullable: true })
  emailVerifiedAt!: Date | null;

  @Column({ name: 'verification_token_hash', type: 'varchar', nullable: true, select: false })
  verificationTokenHash!: string | null;

  @Column({ name: 'verification_token_expires_at', type: 'timestamptz', nullable: true, select: false })
  verificationTokenExpiresAt!: Date | null;
}
