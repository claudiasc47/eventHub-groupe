import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { AuthClient } from 'src/clients/auth.client'
import { Request } from 'express'
import { Reflector } from '@nestjs/core'
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator'
import { AxiosError } from 'axios'

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authClient: AuthClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) return true

    const req = context.switchToHttp().getRequest<Request>()
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      throw new UnauthorizedException('No token provided')
    }

    try {
      const user = await this.authClient.getMe(token)

      req['user'] = user

      console.error('[AuthenticationGuard]: === ALLOWED ===', req['user'])
      return true
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        console.error('[AuthenticationGuard]: === UNAUTHORIZED ===')
        throw new UnauthorizedException('Unauthenticated')
      }
      console.error('[AuthenticationGuard] ERROR:', error)
      throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}
