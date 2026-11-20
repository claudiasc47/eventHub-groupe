import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { toUserResponse } from '../users/dto/user.response';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly users: UsersService, private readonly jwt: JwtService) {}

  async login(dto: LoginDto) {
    const user = await this.users.findByEmailWithPassword(dto.email);
    const ok = user && (await bcrypt.compare(dto.password, user.passwordHash));

    if (!user || !ok) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Identifiants incorrects.',
      });
    }

    const access_token = await this.jwt.signAsync({ sub: user.id, role: user.role });
    return { access_token, user: toUserResponse(user) };
  }
}