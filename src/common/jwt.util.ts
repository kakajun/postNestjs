import jwt from 'jsonwebtoken'

export function parseUser(headers: Record<string, any>) {
  const token = headers['x-token'] || (headers['authorization'] || '').toString().replace(/^Bearer\s+/i, '')
  if (!token) return null
  try {
    const secret = process.env.JWT_SECRET as string
    if (!secret) return null
    const payload: any = jwt.verify(token as string, secret, { ignoreExpiration: true })
    const content = payload?.content ? JSON.parse(payload.content) : payload
    return { userId: String(content?.userId || ''), userType: String(content?.userType || '') }
  } catch {
    return null
  }
}
