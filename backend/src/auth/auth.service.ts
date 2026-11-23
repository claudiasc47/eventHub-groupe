import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { toUserResponse } from '../users/dto/user.response';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';



@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.users.findByEmailWithPassword(dto.email);
    const ok = user && (await bcrypt.compare(dto.password, user.passwordHash));

    if (!user || !ok) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Identifiants incorrects.',
      });
    }

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Veuillez confirmer votre adresse email avant de vous connecter.',
      });
    }

    const access_token = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
    });
    return { access_token, user: toUserResponse(user) };
  }

  verifyEmail(dto: VerifyEmailDto) {
    return this.users.verifyEmail(dto.token);
  }
  resendVerification(dto: ResendVerificationDto) {
    return this.users.resendVerification(dto.email);
  }
}
