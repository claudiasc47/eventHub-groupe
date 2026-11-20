import { Body, Controller, Get, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { toUserResponse } from './dto/user.response';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UserRole } from './user.entity';

@Controller('users')
export class UsersController {
    constructor(private readonly users: UsersService) {}

    @Post('register')
    async register(@Body() dto: RegisterDto) {
        return toUserResponse(await this.users.register(dto));
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    async me(@CurrentUser() current: { id: string }) {
        const user = await this.users.findById(current.id);
        if (!user) {
            throw new UnauthorizedException({
                code: 'UNAUTHENTICATED',
                message: 'Session invalide ou absente.',
            });
        }
        return toUserResponse(user);
    }
    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth()
    async list() {
        const all = await this.users.findAll();
        return all.map(toUserResponse);
    }
}