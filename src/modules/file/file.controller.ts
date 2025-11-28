import { Controller, Delete, Get, Param, Post, UploadedFiles, UseInterceptors, UseInterceptors as UI } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { FilesInterceptor } from '@nestjs/platform-express'
import { Repository } from 'typeorm'
import { ProjectAnnex } from '../../entities/project-annex.entity'
import { ResponseInterceptor } from '../../common/response.interceptor'
import { createMinio } from '../../common/minio.client'
import sharp from 'sharp'
import { ApiOperation, ApiParam, ApiTags, ApiConsumes, ApiBody, ApiOkResponse } from '@nestjs/swagger'
import { Mock } from '../../common/mock'
import { Public } from '../../common/public.decorator'

@ApiTags('File')
@UI(ResponseInterceptor)
@Controller('file')
export class FileController {
  constructor(@InjectRepository(ProjectAnnex) private readonly annexRepo: Repository<ProjectAnnex>) {}

  @Post('upload/:projectId')
  @ApiOperation({ summary: '上传项目附件' })
  @ApiParam({ name: 'projectId', type: String, example: 'P2024112801' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @ApiOkResponse({ description: '成功', content: { 'application/json': { example: Mock.file.upload } } })
  @UseInterceptors(FilesInterceptor('files'))
  async upload(@Param('projectId') projectId: string, @UploadedFiles() files: Express.Multer.File[]) {
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

  @Get('getUrl/:projectId/:imageId')
  @Public()
  @ApiOperation({ summary: '获取附件访问 URL' })
  @ApiParam({ name: 'projectId', type: String, example: 'P2024112801' })
  @ApiParam({ name: 'imageId', type: String, example: 'A2024112801' })
  @ApiOkResponse({ description: '成功', content: { 'application/json': { example: Mock.file.getUrl } } })
  async getUrl(@Param('projectId') projectId: string, @Param('imageId') imageId: string) {
    const annex = await this.annexRepo.findOne({ where: { id: imageId, projectId } })
    if (!annex) return ''
    const minio = createMinio()
    const bucket = process.env.MINIO_BUCKET as string
    if (!bucket) throw new Error('MinIO configuration missing: MINIO_BUCKET')
    const url = await minio.presignedGetObject(bucket, annex.path, Number(process.env.MINIO_EXPIRE))
    return url
  }

  @Delete('del/:projectId/:imageId')
  @ApiOperation({ summary: '删除附件记录' })
  @ApiParam({ name: 'projectId', type: String, example: 'P2024112801' })
  @ApiParam({ name: 'imageId', type: String, example: 'A2024112801' })
  @ApiOkResponse({ description: '成功', content: { 'application/json': { example: Mock.file.del } } })
  async del(@Param('projectId') projectId: string, @Param('imageId') imageId: string) {
    const annex = await this.annexRepo.findOne({ where: { id: imageId, projectId } })
    if (!annex) return false
    await this.annexRepo.delete({ id: imageId })
    return true
  }
}
