import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { RegisterDto } from './dto/register.dto';
import { User } from './user.entity';

@Injectable()
export class UsersService {
    constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

    async register(dto: RegisterDto): Promise<User> {
        const email = dto.email.toLowerCase();

        if (await this.users.existsBy({ email })) {
            throw new ConflictException({ code: 'EMAIL_ALREADY_USED', message: 'Email déjà utilisé.' });
        }

        const user = this.users.create({
            ...dto,
            email,
            passwordHash: await bcrypt.hash(dto.password, 10),
        });
        return this.users.save(user);
    }

    findByEmailWithPassword(email: string) {
        return this.users
            .createQueryBuilder('u')
            .addSelect('u.passwordHash')
            .where('u.email = :email', { email: email.toLowerCase() })
            .getOne();
    }
    findById(id: string) {
        return this.users.findOneBy({ id });
    }
    findAll() {
        return this.users.find({ order: { createdAt: 'ASC' } });
    }
}

