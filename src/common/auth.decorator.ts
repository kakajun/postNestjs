import { SetMetadata } from '@nestjs/common'

export const AUTH_API_KEY = 'userType'
export const AuthApi = (userType: string) => SetMetadata(AUTH_API_KEY, userType)
