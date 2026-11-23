import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('verify-email')
  @HttpCode(200)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.auth.verifyEmail(dto);
    return { verified: true };
  }

  @Post('resend-verification')
  @HttpCode(200)
  async resendVerification(@Body() dto: ResendVerificationDto) {
    await this.auth.resendVerification(dto);
    return { message: 'Si un compte non vérifié existe pour cet email, un nouveau lien a été envoyé.' };
  }
}
