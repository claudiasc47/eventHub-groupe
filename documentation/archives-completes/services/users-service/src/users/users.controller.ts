import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common'

import { UsersService } from './users.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import { UserRole } from './user.entity'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminOnly() {
    return { msg: 'Welcome ADMIN!' }
  }

  @Post('register')
  async register(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('role') role: string,
  ) {
    if (!Object.values(UserRole).includes(role as UserRole)) {
      throw new BadRequestException('Invalid role')
    }
    return this.users.register(email, password, role as UserRole)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user) {
    return this.users.profile(user.sub)
  }

  @Get('all')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.ADMIN)
  async all() {
    return this.users.getAll()
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async delete(@Param('id') id: number) {
    return this.users.deleteUser(id)
  }

  @Post('reset-password')
  @UseGuards(JwtAuthGuard)
  async resetPassword(
    @CurrentUser() user,
    @Body('oldPassword') oldPassword: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.users.resetPassword(user.sub, oldPassword, newPassword)
  }
}
