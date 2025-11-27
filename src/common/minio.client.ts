import { Client } from 'minio'

export function createMinio() {
  const endPoint = process.env.MINIO_ENDPOINT as string
  const accessKey = process.env.MINIO_ACCESS_KEY as string
  const secretKey = process.env.MINIO_SECRET_KEY as string
  if (!endPoint || !accessKey || !secretKey) {
    throw new Error('MinIO configuration missing: MINIO_ENDPOINT/MINIO_ACCESS_KEY/MINIO_SECRET_KEY')
  }
  const useSSL = endPoint.startsWith('https://')
  const host = endPoint.replace(/^https?:\/\//, '')
  const [address, portStr] = host.split(':')
  const port = portStr ? Number(portStr) : useSSL ? 443 : 80
  return new Client({ endPoint: address, port, useSSL, accessKey, secretKey })
}
