import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { UsersService } from '../users/users.service'
import * as bcrypt from 'bcrypt'

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email)
    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    }

    return {
      access_token: this.generateAccessToken(payload),
      refresh_token: this.generateRefreshToken(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    }
  }

  generateAccessToken(payload: any) {
    return this.jwtService.sign(payload, {
      secret: 'SECRET_JWT',
      expiresIn: '15m',
    })
  }

  generateRefreshToken(payload: any) {
    return this.jwtService.sign(payload, {
      secret: 'SECRET_JWT',
      expiresIn: '7d',
    })
  }

  verifyRefreshToken(token: string) {
    try {
      return this.jwtService.verify(token, {
        secret: 'SECRET_JWT',
      })
    } catch {
      throw new UnauthorizedException('Invalid refresh token')
    }
  }
}
