import { Body, Controller, Post } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { toUserResponse } from './dto/user.response';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return toUserResponse(await this.users.register(dto));
  }
}