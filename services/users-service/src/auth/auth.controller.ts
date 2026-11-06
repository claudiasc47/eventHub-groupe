import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common'
import { AuthService } from './auth.service'
import { UsersService } from '../users/users.service'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Post('login')
  async login(@Body('email') email: string, @Body('password') password: string) {
    try {
      const user = await this.users.validateUser(email, password)
      if (!user) {
        throw new UnauthorizedException('Invalid credentials')
      }

      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      }
      return {
        access_token: this.auth.generateAccessToken(payload),
        refresh_token: this.auth.generateRefreshToken(payload),
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error
      }

      console.error('Login error:', error)
      throw new UnauthorizedException('Authentication failed')
    }
  }

  @Post('refresh')
  async refresh(@Body('refresh_token') refreshToken: string) {
    try {
      const payload = this.auth.verifyRefreshToken(refreshToken)

      return {
        access_token: this.auth.generateAccessToken({
          sub: payload.sub,
          email: payload.email,
          role: payload.role,
        }),
      }
    } catch {
      throw new UnauthorizedException('Invalid refresh token')
    }
  }
}
