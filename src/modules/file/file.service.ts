import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import type { Express } from 'express'
import { ProjectAnnex } from '../../entities/project-annex.entity'
import { createMinio } from '../../common/minio.client'
import sharp from 'sharp'

@Injectable()
export class FileService {
  constructor(@InjectRepository(ProjectAnnex) private readonly annexRepo: Repository<ProjectAnnex>) { }

  async upload(projectId: string, files: Express.Multer.File[]): Promise<boolean> {
    if (!files || !files.length) return true
    const minio = createMinio()
    const bucket = process.env.MINIO_BUCKET as string
    if (!bucket) throw new Error('MinIO configuration missing: MINIO_BUCKET')
    for (const file of files) {
      const ext = (file.originalname.split('.').pop() || '').toLowerCase()
      const name = Date.now().toString(36)
      const objectName = `image/${name}.${ext || 'jpg'}`
      await minio.putObject(bucket, objectName, file.buffer)
      let thumbnail: Buffer | undefined
      try {
        thumbnail = await sharp(file.buffer).resize({ width: 100 }).jpeg().toBuffer()
      } catch {
        thumbnail = file.buffer
      }
      const expireSeconds = Number(process.env.MINIO_EXPIRE)
      if (!expireSeconds) throw new Error('MinIO configuration missing: MINIO_EXPIRE')
      const url = await minio.presignedGetObject(bucket, objectName, expireSeconds)
      const annex = this.annexRepo.create({
        id: Date.now().toString(),
        projectId,
        name,
        path: objectName,
        thumbnail,
        url,
      })
      await this.annexRepo.save(annex)
    }
    return true
  }

  async getUrl(projectId: string, imageId: string): Promise<string> {
    const annex = await this.annexRepo.findOne({ where: { id: imageId, projectId } })
    if (!annex) return ''
    const minio = createMinio()
    const bucket = process.env.MINIO_BUCKET as string
    if (!bucket) throw new Error('MinIO configuration missing: MINIO_BUCKET')
    const url = await minio.presignedGetObject(bucket, annex.path, Number(process.env.MINIO_EXPIRE))
    return url
  }

  async del(projectId: string, imageId: string): Promise<boolean> {
    const annex = await this.annexRepo.findOne({ where: { id: imageId, projectId } })
    if (!annex) return false
    await this.annexRepo.delete({ id: imageId })
    return true
  }
}
