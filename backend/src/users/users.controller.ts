import { Body, Controller, Get, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { toUserResponse } from './dto/user.response';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';

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
}