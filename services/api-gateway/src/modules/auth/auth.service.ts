import { Injectable } from '@nestjs/common'
import { AuthClient } from 'src/clients/auth.client'
import { LoginInputDto } from 'src/common/dto/auth/login.input.dto'

@Injectable()
export class AuthService {
  constructor(private readonly authClient: AuthClient) {}

  async login(dto: LoginInputDto) {
    const { access_token, refresh_token, user } = await this.authClient.login(dto)
    return { message: 'Login successful', access_token, refresh_token, user }
  }
}
