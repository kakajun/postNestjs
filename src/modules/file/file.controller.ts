import { Controller, Delete, Get, Param, Post, UploadedFiles, UseInterceptors, UseInterceptors as UI } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { FilesInterceptor } from '@nestjs/platform-express'
import { Repository } from 'typeorm'
import { ProjectAnnex } from '../../entities/project-annex.entity'
import { ResponseInterceptor } from '../../common/response.interceptor'
import { createMinio } from '../../common/minio.client'
import sharp from 'sharp'

@UI(ResponseInterceptor)
@Controller('file')
export class FileController {
  constructor(
    @InjectRepository(ProjectAnnex) private readonly annexRepo: Repository<ProjectAnnex>,
  ) { }

  @Post('upload/:projectId')
  @UseInterceptors(FilesInterceptor('files'))
  async upload(@Param('projectId') projectId: string, @UploadedFiles() files: Express.Multer.File[]) {
    if (!files || !files.length) return true
    const minio = createMinio()
    const bucket = process.env.MINIO_BUCKET || 'wb-bucket'
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
      const expireSeconds = Number(process.env.MINIO_EXPIRE || 3600)
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

  @Get('getUrl/:projectId/:imageId')
  async getUrl(@Param('projectId') projectId: string, @Param('imageId') imageId: string) {
    const annex = await this.annexRepo.findOne({ where: { id: imageId, projectId } })
    if (!annex) return ''
    const minio = createMinio()
    const bucket = process.env.MINIO_BUCKET || 'wb-bucket'
    const url = await minio.presignedGetObject(bucket, annex.path, Number(process.env.MINIO_EXPIRE || 3600))
    return url
  }

  @Delete('del/:projectId/:imageId')
  async del(@Param('projectId') projectId: string, @Param('imageId') imageId: string) {
    const annex = await this.annexRepo.findOne({ where: { id: imageId, projectId } })
    if (!annex) return false
    await this.annexRepo.delete({ id: imageId })
    return true
  }
}
