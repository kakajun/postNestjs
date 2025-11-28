import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { FilesInterceptor } from '@nestjs/platform-express'
import { Repository } from 'typeorm'
import { Project } from '../../entities/project.entity'
import { ProjectAnnex } from '../../entities/project-annex.entity'
import { SysUserExtra } from '../../entities/sys-user-extra.entity'
import { UserProject } from '../../entities/user-project.entity'
import { SysUser } from '../../entities/sys-user.entity'
import { SysDictData } from '../../entities/sys-dict-data.entity'
import { ResponseInterceptor } from '../../common/response.interceptor'
import { AuthGuard } from '../../common/auth.guard'
import { AuthApi } from '../../common/auth.decorator'
import { createMinio } from '../../common/minio.client'
import sharp from 'sharp'
import { parseUser } from '../../common/jwt.util'
import { Public } from '../../common/public.decorator'
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiBearerAuth, ApiConsumes, ApiOkResponse } from '@nestjs/swagger'
import { Mock } from '../../common/mock'

@ApiTags('Project')
@UseInterceptors(ResponseInterceptor)
@Controller('project')
export class ProjectController {
  constructor(
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectAnnex) private readonly annexRepo: Repository<ProjectAnnex>,
    @InjectRepository(SysUserExtra) private readonly userExtraRepo: Repository<SysUserExtra>,
    @InjectRepository(UserProject) private readonly userProjectRepo: Repository<UserProject>,
    @InjectRepository(SysUser) private readonly userRepo: Repository<SysUser>,
    @InjectRepository(SysDictData) private readonly dictRepo: Repository<SysDictData>
  ) { }

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
    const page = Number(pageNo)
    const size = Number(pageSize)
    if (longitude != null && latitude != null) {
      // 基于经纬度的附近项目：用原生 SQL 近似实现（与 Mapper 保持一致筛选）
      const offset = (page - 1) * size
      const records: Project[] = await this.projectRepo.query(
        `SELECT p.* FROM t_project p
         LEFT JOIN sys_user_extra ue ON p.publisher_id = ue.user_id
         LEFT JOIN sys_user u ON ue.user_id = u.user_id AND u.status = 0
         WHERE p.status = 1 AND p.audit_status = 1 AND u.status = 0
           AND ST_Distance_Sphere(POINT(? , ?), POINT(ue.longitude, ue.latitude)) <= ?
         ORDER BY p.create_time DESC LIMIT ? OFFSET ?`,
        [longitude, latitude, distance, size, offset]
      )
      const totalRes = await this.projectRepo.query(
        `SELECT count(*) as cnt FROM t_project p
         LEFT JOIN sys_user_extra ue ON p.publisher_id = ue.user_id
         LEFT JOIN sys_user u ON ue.user_id = u.user_id AND u.status = 0
         WHERE p.status = 1 AND p.audit_status = 1 AND u.status = 0
           AND ST_Distance_Sphere(POINT(? , ?), POINT(ue.longitude, ue.latitude)) <= ?`,
        [longitude, latitude, distance]
      )
      const total = Number(totalRes?.[0]?.cnt || 0)
      const projectIds = records.map((r) => r.id)
      if (projectIds.length) {
        const annexes = await this.annexRepo
          .createQueryBuilder('a')
          .where('a.project_id IN (:...ids)', { ids: projectIds })
          .select(['a.id', 'a.projectId', 'a.name', 'a.thumbnail', 'a.url', 'a.expireTime'])
          .getMany()
        const map = new Map<string, any[]>()
        annexes.forEach((a) => {
          const arr = map.get(a.projectId) || []
          arr.push({ id: a.id, name: a.name, thumbnail: a.thumbnail, url: a.url, expireTime: a.expireTime })
          map.set(a.projectId, arr)
        })
          ; (records as any).forEach((r: any) => (r.annexList = map.get(r.id) || []))
      }
      const respRecords = (records as any[]).map((r: any) => {
        const { name, ...rest } = r
        return { ...rest, projectName: name, annexList: r.annexList || [] }
      })
      const pages = Math.ceil(total / size)
      return { records: respRecords, total, current: page, size, pages }
    }
    // 无经纬度：返回开放且审核通过的项目分页
    const [recordsRaw, total] = await this.projectRepo.findAndCount({
      where: { status: 1, auditStatus: 1 },
      order: { createTime: 'DESC' },
      skip: (page - 1) * size,
      take: size,
    })
    const records = (recordsRaw as any[]).map((r: any) => {
      const { name, ...rest } = r
      return { ...rest, projectName: name }
    })
    const pages = Math.ceil(total / size)
    return { records, total, current: page, size, pages }
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
    const page = Number(pageNo)
    const size = Number(pageSize)
    const where: any = {}
    if (publisherId) where.publisherId = publisherId
    if (name && name.trim()) where.name = name
    const [recordsRaw, total] = await this.projectRepo.findAndCount({
      where,
      select: ['id', 'name', 'category', 'status', 'auditStatus', 'auditRemark', 'createTime'],
      order: { createTime: 'DESC' },
      skip: (page - 1) * size,
      take: size,
    })
    const records = (recordsRaw as any[]).map((r: any) => {
      const { name, status, auditStatus, ...rest } = r
      const statusText = Number(status) === 1 ? '开启' : '推送关闭'
      const auditText = Number(auditStatus) === 1 ? '审核通过' : Number(auditStatus) === 3 ? '审核未通过' : '审核中'
      return { ...rest, projectName: name, status: statusText, auditStatus: auditText }
    })
    const pages = Math.ceil(total / size)
    return { records, total, current: page, size, pages }
  }

  @Get('detail/:id')
  @Public()
  @ApiOperation({ summary: '项目详情' })
  @ApiParam({ name: 'id', type: String, example: 'P2024112801' })
  @ApiOkResponse({ description: '成功', content: { 'application/json': { example: Mock.project.detail } } })
  async detail(@Param('id') id: string) {
    const proj = await this.projectRepo.findOne({ where: { id } })
    if (!proj) return null
    const annexes = await this.annexRepo.find({ where: { projectId: id }, select: ['id', 'name', 'thumbnail', 'url', 'expireTime'] })
    const now = Date.now()
    annexes.forEach((a) => {
      if (a.expireTime && new Date(a.expireTime).getTime() < now) a.url = ''
    })
    const { name, status, auditStatus, auditRemark, createTime, ...rest } = proj as any
    const statusText = Number(status) === 1 ? '开启' : '推送关闭'
    const auditText = Number(auditStatus) === 1 ? '审核通过' : Number(auditStatus) === 3 ? '审核未通过' : '审核中'
    const ups = await this.userProjectRepo.find({ where: { projectId: id } })
    const uids = Array.from(new Set(ups.map((u) => u.uid)))
    let users: SysUser[] = []
    if (uids.length) {
      users = await this.userRepo
        .createQueryBuilder('u')
        .select(['u.userId', 'u.userName', 'u.phonenumber'])
        .where('u.user_id IN (:...ids)', { ids: uids })
        .getMany()
    }
    const userMap = new Map<string, SysUser>()
    users.forEach((u) => userMap.set(u.userId, u))
    const projectUserVOList = ups.map((up) => ({
      name: userMap.get(up.uid)?.userName,
      phone: userMap.get(up.uid)?.phonenumber,
      takeTime: up.takeTime,
    }))
    return {
      ...rest,
      projectName: name,
      status: statusText,
      auditStatus: auditText,
      auditRemark,
      createTime,
      annexList: annexes,
      projectUserVOList,
    }
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
    const proj = await this.projectRepo.findOne({ where: { id } })
    if (!proj) return false
    await this.projectRepo.update({ id }, { status })
    return true
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
    await this.projectRepo.delete({ id })
    await this.annexRepo.delete({ projectId: id })
    return true
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
    const name = body?.projectName || body?.name || ''
    const technology = body?.technical || body?.technology || ''
    const request = body?.request || ''
    const category = body?.category || ''
    if (files && files.length > 3) throw new HttpException('图片不能超过3张', 400)
    const id = Date.now().toString()
    const userId = body?.publisherId || '0'
    await this.projectRepo.save({
      id,
      publisherId: userId,
      name,
      technology,
      request,
      category,
      status: 1,
      auditStatus: 1,
      createTime: new Date(),
      updateTime: new Date(),
    })
    if (files && files.length) {
      const minio = createMinio()
      const bucket = process.env.MINIO_BUCKET as string
      if (!bucket) throw new Error('MinIO configuration missing: MINIO_BUCKET')
      for (const file of files) {
        const ext = (file.originalname.split('.').pop() || '').toLowerCase()
        const obj = `image/${Date.now().toString(36)}.${ext || 'jpg'}`
        await minio.putObject(bucket, obj, file.buffer)
        let thumbnail: Buffer | undefined
        try {
          thumbnail = await sharp(file.buffer).resize({ width: 100 }).jpeg().toBuffer()
        } catch {
          thumbnail = file.buffer
        }
        const expire = Number(process.env.MINIO_EXPIRE)
        if (!expire) throw new Error('MinIO configuration missing: MINIO_EXPIRE')
        const url = await minio.presignedGetObject(bucket, obj, expire)
        await this.annexRepo.save({
          id: Date.now().toString(),
          projectId: id,
          name: file.originalname,
          path: obj,
          thumbnail,
          url,
        })
      }
    }
    return true
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
    const id = body?.id
    const project = await this.projectRepo.findOne({ where: { id } })
    if (!project) return false
    const annexCount = await this.annexRepo.count({ where: { projectId: id } })
    const addCount = files ? files.length : 0
    if (annexCount + addCount > 3) throw new HttpException('不能超过3张图片', 400)
    await this.projectRepo.update(
      { id },
      {
        name: body?.projectName || project.name,
        technology: body?.technical || body?.technology || project.technology,
        request: body?.request || project.request,
        auditStatus: 0,
        auditRemark: '',
        updateTime: new Date(),
      }
    )
    if (files && files.length) {
      const minio = createMinio()
      const bucket = process.env.MINIO_BUCKET as string
      if (!bucket) throw new Error('MinIO configuration missing: MINIO_BUCKET')
      for (const file of files) {
        const ext = (file.originalname.split('.').pop() || '').toLowerCase()
        const obj = `image/${Date.now().toString(36)}.${ext || 'jpg'}`
        await minio.putObject(bucket, obj, file.buffer)
        let thumbnail: Buffer | undefined
        try {
          thumbnail = await sharp(file.buffer).resize({ width: 100 }).jpeg().toBuffer()
        } catch {
          thumbnail = file.buffer
        }
        const expire = Number(process.env.MINIO_EXPIRE)
        if (!expire) throw new Error('MinIO configuration missing: MINIO_EXPIRE')
        const url = await minio.presignedGetObject(bucket, obj, expire)
        await this.annexRepo.save({
          id: Date.now().toString(),
          projectId: id,
          name: project.name,
          path: obj,
          thumbnail,
          url,
        })
      }
    }
    return true
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
    @Query() query: any,
    @Body() _body: any,
    @Param() _param: any,
    @UploadedFiles() _f?: any
  ) {
    const user = parseUser((query as any)?._headers || {}) || null
    const reqUser = user
    const auditorIds = await this.dictRepo
      .createQueryBuilder('d')
      .select(['d.dictLabel'])
      .where('d.dictType = :t', { t: 'project_auditor' })
      .getMany()
    const auditorSet = new Set(auditorIds.map((d) => String(d.dictLabel)))
    if (!reqUser || !auditorSet.has(String(reqUser.userId))) throw new HttpException('FORBIDDEN', 403)
    const page = Number(pageNo),
      size = Number(pageSize)
    const [projects, total] = await this.projectRepo.findAndCount({
      where: { auditStatus: 0 },
      skip: (page - 1) * size,
      take: size,
    })
    if (!projects.length) return { records: [], total, current: page, size, pages: Math.ceil(total / size) }
    const publisherIds = projects.map((p) => p.publisherId)
    const orgs = await this.userExtraRepo
      .createQueryBuilder('e')
      .select(['e.userId', 'e.orgName'])
      .where('e.user_id IN (:...ids)', { ids: publisherIds })
      .getMany()
    const orgMap = new Map<string, string>()
    orgs.forEach((e) => orgMap.set(e.userId, e.orgName))
    const records = projects.map((p) => {
      const { name, ...rest } = p as any
      return { ...rest, projectName: name, auditStatus: '待审核', publisher: orgMap.get(p.publisherId) }
    })
    const pages = Math.ceil(total / size)
    return { records, total, current: page, size, pages }
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
    const user = parseUser((query as any)?._headers || {}) || null
    const auditorIds = await this.dictRepo
      .createQueryBuilder('d')
      .select(['d.dictLabel'])
      .where('d.dictType = :t', { t: 'project_auditor' })
      .getMany()
    const auditorSet = new Set(auditorIds.map((d) => String(d.dictLabel)))
    if (!user || !auditorSet.has(String(user.userId))) throw new HttpException('FORBIDDEN', 403)
    const { projectId, audit, remark = '' } = body
    await this.projectRepo.update({ id: projectId }, { auditStatus: Number(audit), auditRemark: remark })
    return true
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
    const { projectId, status, distance = 200000 } = body || {}
    const uid = '0'
    const my = await this.userProjectRepo.findOne({ where: { projectId, uid } })
    if (my) return false
    const sysExtra = await this.userExtraRepo.findOne({ where: { userId: uid } })
    const cntRes = await this.projectRepo.query(
      `SELECT count(*) as cnt FROM t_project p
       LEFT JOIN sys_user_extra ue ON p.publisher_id = ue.user_id
       WHERE p.id = ? AND ST_Distance_Sphere(POINT(?, ?), POINT(ue.longitude, ue.latitude)) <= ?`,
      [projectId, sysExtra?.longitude, sysExtra?.latitude, distance]
    )
    if (Number(cntRes?.[0]?.cnt || 0) === 0) return false
    const rec = this.userProjectRepo.create({ id: Date.now().toString(), projectId, status, uid })
    if (status === 1) rec.takeTime = new Date()
    await this.userProjectRepo.save(rec)
    return true
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
    const page = Number(pageNo)
    const size = Number(pageSize)
    const [userProjects, total] = await this.userProjectRepo.findAndCount({
      where: {},
      order: { takeTime: 'DESC' },
      skip: (page - 1) * size,
      take: size,
    })
    if (!userProjects.length) return { records: [], total, current: page, size }
    const projectIds = userProjects.map((up) => up.projectId)
    const projects = await this.projectRepo.findByIds(projectIds)
    const annexes = await this.annexRepo
      .createQueryBuilder('a')
      .where('a.project_id IN (:...ids)', { ids: projectIds })
      .select(['a.id', 'a.projectId', 'a.name', 'a.thumbnail', 'a.url', 'a.expireTime'])
      .getMany()
    const annexMap = new Map<string, any[]>()
    annexes.forEach((a) => {
      const arr = annexMap.get(a.projectId) || []
      arr.push({ id: a.id, name: a.name, thumbnail: a.thumbnail, url: a.url, expireTime: a.expireTime })
      annexMap.set(a.projectId, arr)
    })
    const publisherIds = projects.map((p) => p.publisherId)
    const publisherMap = new Map<string, SysUser>()
    const users = await this.userRepo
      .createQueryBuilder('u')
      .select(['u.userId', 'u.userName', 'u.phonenumber'])
      .where('u.user_id IN (:...ids)', { ids: publisherIds })
      .getMany()
    users.forEach((u) => publisherMap.set(u.userId, u))
    const records = projects.map((p) => {
      const { name, ...rest } = p as any
      return {
        ...rest,
        projectName: name,
        status: Number((p as any).status) === 1 ? '开启' : '推送关闭',
        annexList: annexMap.get(p.id) || [],
        contact: publisherMap.get(p.publisherId)?.userName,
        phone: publisherMap.get(p.publisherId)?.phonenumber,
        takeTime: userProjects.find((up) => up.projectId === p.id)?.takeTime,
      }
    })
    const pages = Math.ceil(total / size)
    return { records, total, current: page, size, pages }
  }
}
