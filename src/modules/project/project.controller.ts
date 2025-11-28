import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import { ResponseInterceptor } from '../../common/response.interceptor'
import { AuthGuard } from '../../common/auth.guard'
import { AuthApi } from '../../common/auth.decorator'
import { Public } from '../../common/public.decorator'
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiBearerAuth, ApiConsumes, ApiOkResponse } from '@nestjs/swagger'
import { Mock } from '../../common/mock'
import { ProjectService } from './project.service'

@ApiTags('Project')
@UseInterceptors(ResponseInterceptor)
@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get('hall')
  @Public()
  @ApiOperation({ summary: '项目大厅' })
  @ApiQuery({ name: 'pageNo', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'distance', required: false, type: Number, example: 200000 })
  @ApiQuery({ name: 'longitude', required: false, type: Number, example: 120.1234 })
  @ApiQuery({ name: 'latitude', required: false, type: Number, example: 30.1234 })
  @ApiOkResponse({ description: '成功', content: { 'application/json': { example: Mock.project.hall } } })
  async hall(
    @Query('pageNo') pageNo = 1,
    @Query('pageSize') pageSize = 10,
    @Query('distance') distance = 200000,
    @Query('longitude') longitude?: number,
    @Query('latitude') latitude?: number
  ) {
    return this.projectService.hall(pageNo, pageSize, distance, longitude, latitude)
  }

  @Get('list')
  @ApiOperation({ summary: '我发布的项目列表' })
  @ApiQuery({ name: 'name', required: false, type: String, example: '项目A' })
  @ApiQuery({ name: 'pageNo', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'publisherId', required: false, type: String, example: '100' })
  @ApiBearerAuth('bearer')
  @ApiOkResponse({ description: '成功', content: { 'application/json': { example: Mock.project.list } } })
  @UseGuards(AuthGuard)
  @AuthApi('01')
  async list(
    @Query('name') name?: string,
    @Query('pageNo') pageNo = 1,
    @Query('pageSize') pageSize = 10,
    @Query('publisherId') publisherId?: string
  ) {
    return this.projectService.list(name, pageNo, pageSize, publisherId)
  }

  @Get('detail/:id')
  @Public()
  @ApiOperation({ summary: '项目详情' })
  @ApiParam({ name: 'id', type: String, example: 'P2024112801' })
  @ApiOkResponse({ description: '成功', content: { 'application/json': { example: Mock.project.detail } } })
  async detail(@Param('id') id: string) {
    return this.projectService.detail(id)
  }

  @ApiOperation({ summary: '更新推送状态' })
  @ApiBody({
    schema: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'integer' } } },
    examples: { demo: { value: { id: 'P2024112801', status: 1 } } },
  })
  @ApiBearerAuth('bearer')
  @ApiOkResponse({
    description: '成功',
    content: { 'application/json': { example: Mock.project.push } },
  })
  @UseGuards(AuthGuard)
  @AuthApi('01')
  @Put('push')
  async push(@Body() body: any) {
    const { id, status } = body
    return this.projectService.push(id, status)
  }

  @ApiOperation({ summary: '删除项目' })
  @ApiParam({ name: 'id', type: String, example: 'P2024112801' })
  @ApiBearerAuth('bearer')
  @UseGuards(AuthGuard)
  @AuthApi('01')
  @Delete('delete/:id')
  @ApiOkResponse({
    description: '成功',
    content: { 'application/json': { example: Mock.project.delete } },
  })
  async delete(@Param('id') id: string) {
    return this.projectService.delete(id)
  }

  @Post('add')
  @ApiOperation({ summary: '新增项目（JSON 或 multipart）' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        projectName: { type: 'string' },
        technology: { type: 'string' },
        request: { type: 'string' },
        category: { type: 'string' },
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
    examples: {
      json: {
        value: { projectName: '项目A', technology: 'Java', request: '功能需求', category: 'A' },
      },
    },
  })
  @ApiOkResponse({
    description: '成功',
    content: { 'application/json': { example: Mock.project.add } },
  })
  @ApiBearerAuth('bearer')
  @UseGuards(AuthGuard)
  @AuthApi('01')
  @UseInterceptors(FilesInterceptor('files'))
  async add(@UploadedFiles() files: Express.Multer.File[], @Body() body: any) {
    return this.projectService.add(files, body)
  }

  @Put('update')
  @ApiOperation({ summary: '更新项目（可追加附件）' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        projectName: { type: 'string' },
        technology: { type: 'string' },
        request: { type: 'string' },
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
    examples: {
      json: {
        value: { id: 'P2024112801', projectName: '项目A', technology: 'Java', request: '更新需求' },
      },
    },
  })
  @ApiOkResponse({
    description: '成功',
    content: { 'application/json': { example: Mock.project.update } },
  })
  @ApiBearerAuth('bearer')
  @UseGuards(AuthGuard)
  @AuthApi('01')
  @UseInterceptors(FilesInterceptor('files'))
  async update(@UploadedFiles() files: Express.Multer.File[], @Body() body: any) {
    return this.projectService.update(files, body)
  }

  @Get('my/audit/list')
  @ApiOperation({ summary: '待审核项目列表（审核员）' })
  @ApiQuery({ name: 'pageNo', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 10 })
  @ApiBearerAuth('bearer')
  @ApiOkResponse({ description: '成功', content: { 'application/json': { example: Mock.project.myAuditList } } })
  async myAuditList(
    @Query('pageNo') pageNo = 1,
    @Query('pageSize') pageSize = 10,
    @Query() query: any
  ) {
    return this.projectService.myAuditList(pageNo, pageSize, query)
  }

  @Put('update/audit')
  @ApiOperation({ summary: '更新项目审核结果（审核员）' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        audit: { type: 'integer' },
        remark: { type: 'string' },
      },
    },
    examples: { demo: { value: { projectId: 'P2024112801', audit: 1, remark: '通过' } } },
  })
  @ApiBearerAuth('bearer')
  @ApiOkResponse({ description: '成功', content: { 'application/json': { example: Mock.project.updateAudit } } })
  async updateAudit(@Body() body: any, @Query() query: any) {
    return this.projectService.updateAudit(body, query)
  }
  @UseGuards(AuthGuard)
  @AuthApi('02')
  @Post('take')
  @ApiOperation({ summary: '接单/拒绝（接单方）' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        status: { type: 'integer' },
        distance: { type: 'integer' },
      },
    },
    examples: { demo: { value: { projectId: 'P2024112801', status: 1, distance: 200000 } } },
  })
  @ApiBearerAuth('bearer')
  @ApiOkResponse({ description: '成功', content: { 'application/json': { example: Mock.project.take } } })
  async take(@Body() body: any) {
    return this.projectService.take(body)
  }

  @UseGuards(AuthGuard)
  @AuthApi('02')
  @Get('my/take/list')
  @ApiOperation({ summary: '我的接单列表（接单方）' })
  @ApiQuery({ name: 'pageNo', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 10 })
  @ApiBearerAuth('bearer')
  @ApiOkResponse({ description: '成功', content: { 'application/json': { example: Mock.project.myTakeList } } })
  async myTakeList(@Query('pageNo') pageNo = 1, @Query('pageSize') pageSize = 10) {
    return this.projectService.myTakeList(pageNo, pageSize)
  }
}
