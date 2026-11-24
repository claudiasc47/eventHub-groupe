import { IsEmail, IsInt, IsPositive } from 'class-validator'

export class LoginOutputDto {
  message: 'Login successful' | 'Invalid credentials'
  access_token?: string
  refresh_token?: string
  user?: UserDto
  error?: 'Invalid credentials'
  statusCode?: number
}

class UserDto {
  @IsInt()
  @IsPositive()
  id: number

  @IsEmail()
  email: string

  role: 'admin' | 'organizer' | 'participant'
}
