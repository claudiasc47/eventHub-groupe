import { Controller, Body, Post } from '@nestjs/common'
import { AuthService } from './auth.service'
import { LoginInputDto } from 'src/common/dto/auth/login.input.dto'
import { Public } from 'src/common/decorators/public.decorator'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginInputDto) {
    return this.authService.login(dto)
  }
}
