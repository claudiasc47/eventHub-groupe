import { Body, Controller, Post } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { toUserResponse } from './dto/user.response';
import { UsersService } from './users.service';
import { ApiBadRequestResponse, ApiConflictResponse, ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';

@Controller('users')
export class UsersController {
    constructor(private readonly users: UsersService) {}

    @Post('register')
    // @ApiOperation({ summary: 'Créer un compte participant' })
    // @ApiCreatedResponse({ type: toUserResponse })
    // @ApiBadRequestResponse({ description: 'VALIDATION_ERROR : données invalides' })
    // @ApiConflictResponse({ description: 'EMAIL_ALREADY_USED : email déjà utilisé' })

    async register(@Body() dto: RegisterDto) {
        return toUserResponse(await this.users.register(dto));
    }
}