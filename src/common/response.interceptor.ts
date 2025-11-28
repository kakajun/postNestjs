import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from '@nestjs/common'
import { Observable } from 'rxjs'
import { map, tap, catchError } from 'rxjs/operators'
import * as fs from 'fs'
import * as path from 'path'

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP')

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp()
    const req = ctx.getRequest()
    const start = Date.now()
    const headers = { ...(req?.headers || {}) }
    if (headers['authorization']) headers['authorization'] = '***'
    if (headers['x-token']) headers['x-token'] = '***'
    const now = new Date()
    const yyyy = now.getFullYear().toString()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const hh = String(now.getHours()).padStart(2, '0')
    const dir = path.join(process.cwd(), 'logs')
    const file = path.join(dir, `http-${yyyy}${mm}${dd}-${hh}.txt`)
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    } catch { }
    const logReq = {
      method: req?.method,
      url: req?.originalUrl || req?.url,
      ip: req?.ip,
      params: req?.params,
      query: req?.query,
      body: req?.body,
      headers,
    }
    // 控制台只打印请求接口
    this.logger.log(`${logReq.method} ${logReq.url}`)
    return next.handle().pipe(
      map((data) => ({ code: 200, msg: 'success', data })),
      tap((resp) => {
        const durationMs = Date.now() - start
        const line = JSON.stringify({ req: logReq, res: resp, durationMs }) + '\n'
        try {
          fs.appendFileSync(file, line)
        } catch { }
      }),
      catchError((err) => {
        const durationMs = Date.now() - start
        const line = JSON.stringify({ req: logReq, err: String(err?.message || err), durationMs }) + '\n'
        try {
          fs.appendFileSync(file, line)
        } catch { }
        throw err
      })
    )
  }
}
