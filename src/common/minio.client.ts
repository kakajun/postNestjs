import { Client } from 'minio'

export function createMinio() {
  const endPoint = process.env.MINIO_ENDPOINT || 'http://oss.api.huizetech.cn'
  const accessKey = process.env.MINIO_ACCESS_KEY || '7IJ1Ko7niji6VcscJGCt'
  const secretKey = process.env.MINIO_SECRET_KEY || 'wwSMJTb6k5QhZLWHBK9dFuBYMCAr34DbIp1jaiex'
  const useSSL = endPoint.startsWith('https://')
  const host = endPoint.replace(/^https?:\/\//, '')
  const [address, portStr] = host.split(':')
  const port = portStr ? Number(portStr) : (useSSL ? 443 : 80)
  return new Client({ endPoint: address, port, useSSL, accessKey, secretKey })
}
