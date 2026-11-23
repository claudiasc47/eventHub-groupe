import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { RegisterDto } from './dto/register.dto';
import { User } from './user.entity';
import { MailService } from '../mail/mail.service';
import { createVerificationToken, hashToken, TOKEN_LIFETIME_MS } from '../common/utils/verification-token';

const RESEND_COOLDOWN_MS = 60_000;
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly mail: MailService
  ) {}

  async register(dto: RegisterDto): Promise<User> {
    const email = dto.email.toLowerCase();

    if (await this.users.existsBy({ email })) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_USED',
        message: 'Email déjà utilisé.',
      });
    }

    const { password, ...rest } = dto;
    const verification = createVerificationToken();

    const saved = await this.users.save(
      this.users.create({
        ...rest,
        email,
        passwordHash: await bcrypt.hash(password, 10),
        verificationTokenHash: verification.hash,
        verificationTokenExpiresAt: verification.expiresAt,
      }),
    );

    try {
      await this.mail.sendVerificationEmail(saved.email, verification.token);
    } catch (error) {
      this.logger.error(
        `Verification email failed for user ${saved.id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    return saved;
  }

  findByEmailWithPassword(email: string) {
    return this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email: email.toLowerCase() })
      .getOne();
  }
  findById(id: string) {
    return this.users.findOneBy({ id });
  }
  findAll() {
    return this.users.find({ order: { createdAt: 'ASC' } });
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect(['u.verificationTokenHash', 'u.verificationTokenExpiresAt'])
      .where('u.verificationTokenHash = :hash', { hash: hashToken(token) })
      .getOne();

    if (!user || !user.verificationTokenExpiresAt || user.verificationTokenExpiresAt < new Date()) {
      throw new BadRequestException({
        code: 'INVALID_VERIFICATION_TOKEN',
        message: 'Lien de vérification invalide ou expiré.',
      });
    }

    await this.users.update(user.id, {
      emailVerifiedAt: new Date(),
      verificationTokenHash: null,
      verificationTokenExpiresAt: null,
    });
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.users.findOne({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, emailVerifiedAt: true, verificationTokenExpiresAt: true },
    });

    if (!user || user.emailVerifiedAt) return;

    const lastIssuedAt = user.verificationTokenExpiresAt
      ? user.verificationTokenExpiresAt.getTime() - TOKEN_LIFETIME_MS
      : 0;
    if (Date.now() - lastIssuedAt < RESEND_COOLDOWN_MS) return;

    const verification = createVerificationToken();
    await this.users.update(user.id, {
      verificationTokenHash: verification.hash,
      verificationTokenExpiresAt: verification.expiresAt,
    });

    try {
      await this.mail.sendVerificationEmail(user.email, verification.token);
    } catch (error) {
      this.logger.error(
        `Verification email failed for user ${user.id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
