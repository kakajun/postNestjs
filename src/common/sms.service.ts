export class SmsService {
  private store = new Map<string, { code: string; expire: number }>()
  private windowStart = 0
  private windowCount = 0
  private readonly limitPerSecond = 200

  rateLimitCheck() {
    const now = Date.now()
    if (now - this.windowStart >= 1000) {
      this.windowStart = now
      this.windowCount = 0
    }
    if (this.windowCount >= this.limitPerSecond) return false
    this.windowCount += 1
    return true
  }

  set(phone: string, code: string, ttlMs = 5 * 60 * 1000) {
    const now = Date.now()
    this.store.set(phone, { code, expire: now + ttlMs })
  }

  get(phone: string) {
    const v = this.store.get(phone)
    if (!v) return null
    if (Date.now() > v.expire) return null
    return v.code
  }

  clear(phone: string) {
    this.store.delete(phone)
  }
}
