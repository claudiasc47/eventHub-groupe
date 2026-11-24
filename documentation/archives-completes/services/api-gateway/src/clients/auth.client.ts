import { Injectable, UnauthorizedException } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { AxiosError } from 'axios'
import { firstValueFrom } from 'rxjs/internal/firstValueFrom'
import { LoginInputDto } from 'src/common/dto/auth/login.input.dto'
import { LoginOutputDto } from 'src/common/dto/auth/login.output.dto'

@Injectable()
export class AuthClient {
  private readonly baseUrl = process.env.USERS_SERVICE_URL

  constructor(private readonly http: HttpService) {}

  async login(dto: LoginInputDto): Promise<LoginOutputDto> {
    const { email, password } = dto
    try {
      const { data } = await firstValueFrom(
        this.http.post<LoginOutputDto>(`${this.baseUrl}/auth/login`, { email, password }),
      )
      return data
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        throw new UnauthorizedException('Invalid credentials')
      }
      console.error('AuthClient login error:', error)
      throw error
    }
  }

  async getMe(token: string) {
    const { data } = await firstValueFrom(
      this.http.get<{ id: string; email: string; role: string }>(`${this.baseUrl}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    )
    return data
  }
}
