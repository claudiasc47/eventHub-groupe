import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common'
import { Repository } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from 'bcrypt'
import { User, UserRole } from './user.entity'

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async register(email: string, password: string, role: UserRole) {
    const hash = await bcrypt.hash(password, 10)

    const user = this.repo.create({
      email,
      password: hash,
      role,
    })

    await this.repo.save(user)

    return {
      message: 'User registered',
      user: { id: user.id, email: user.email, role: user.role },
    }
  }

  async validateUser(email: string, password: string) {
    const user = await this.repo.findOne({ where: { email } })
    if (!user) return null

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return null

    return user
  }

  async profile(id: number) {
    const user = await this.repo.findOne({
      where: { id },
      select: ['id', 'email', 'role'],
    })

    if (!user) throw new NotFoundException('User not found')
    return user
  }

  async getAll() {
    return await this.repo.find({
      select: ['id', 'email', 'role'],
    })
  }

  async resetPassword(id: number, oldPass: string, newPass: string) {
    const user = await this.repo.findOne({ where: { id } })
    if (!user) throw new UnauthorizedException('User not found')

    const valid = await bcrypt.compare(oldPass, user.password)
    if (!valid) throw new UnauthorizedException('Old password invalid')

    user.password = await bcrypt.hash(newPass, 10)
    await this.repo.save(user)

    return { message: 'Password updated successfully' }
  }

  async deleteUser(id: number) {
    const result = await this.repo.delete(id)

    if (result.affected === 0) {
      throw new NotFoundException('User not found')
    }

    return { message: 'User deleted successfully' }
  }

  async findByEmail(email: string) {
    return await this.repo.findOne({ where: { email } })
  }
}
