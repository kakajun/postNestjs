import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AUTH_API_KEY } from './auth.decorator'
import { IS_PUBLIC_KEY } from '@/common/public.decorator'
import jwt from 'jsonwebtoken'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])
    if (isPublic) return true
    const requiredType = this.reflector.get<string>(AUTH_API_KEY, context.getHandler())
    if (!requiredType) return true
    const req = context.switchToHttp().getRequest()
    const token = req.headers['x-token'] || (req.headers['authorization'] || '').toString().replace(/^Bearer\s+/i, '')
    if (!token) return false
    try {
      const secret = process.env.JWT_SECRET || 'wb-secret'
      const payload: any = jwt.verify(token as string, secret, { ignoreExpiration: true })
      const content = payload?.content ? JSON.parse(payload.content) : payload
      const userType = content?.userType
      req.user = { userId: content?.userId, userType }
      return String(userType) === String(requiredType)
    } catch {
      return false
    }
  }
}
