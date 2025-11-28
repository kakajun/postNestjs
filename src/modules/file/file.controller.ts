import { Controller, Delete, Get, Param, Post, UploadedFiles, UseInterceptors, UseInterceptors as UI } from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import { ResponseInterceptor } from '../../common/response.interceptor'
import { ApiOperation, ApiParam, ApiTags, ApiConsumes, ApiBody, ApiOkResponse } from '@nestjs/swagger'
import { Mock } from '../../common/mock'
import { Public } from '../../common/public.decorator'
import { FileService } from './file.service'

@ApiTags('File')
@UI(ResponseInterceptor)
@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) { }

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
    return this.fileService.upload(projectId, files)
  }

  @Get('getUrl/:projectId/:imageId')
  @Public()
  @ApiOperation({ summary: '获取附件访问 URL' })
  @ApiParam({ name: 'projectId', type: String, example: 'P2024112801' })
  @ApiParam({ name: 'imageId', type: String, example: 'A2024112801' })
  @ApiOkResponse({ description: '成功', content: { 'application/json': { example: Mock.file.getUrl } } })
  async getUrl(@Param('projectId') projectId: string, @Param('imageId') imageId: string) {
    return this.fileService.getUrl(projectId, imageId)
  }

  @Delete('del/:projectId/:imageId')
  @ApiOperation({ summary: '删除附件记录' })
  @ApiParam({ name: 'projectId', type: String, example: 'P2024112801' })
  @ApiParam({ name: 'imageId', type: String, example: 'A2024112801' })
  @ApiOkResponse({ description: '成功', content: { 'application/json': { example: Mock.file.del } } })
  async del(@Param('projectId') projectId: string, @Param('imageId') imageId: string) {
    return this.fileService.del(projectId, imageId)
  }
}
