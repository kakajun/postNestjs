import { Injectable, HttpException, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Project } from '../../entities/project.entity'
import { ProjectAnnex } from '../../entities/project-annex.entity'
import { SysUserExtra } from '../../entities/sys-user-extra.entity'
import { UserProject } from '../../entities/user-project.entity'
import { SysUser } from '../../entities/sys-user.entity'
import { SysDictData } from '../../entities/sys-dict-data.entity'
import { createMinio } from '../../common/minio.client'
import sharp from 'sharp'
import { parseUser } from '../../common/jwt.util'

@Injectable()
export class ProjectService implements OnModuleInit {
  constructor(
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectAnnex) private readonly annexRepo: Repository<ProjectAnnex>,
    @InjectRepository(SysUserExtra) private readonly userExtraRepo: Repository<SysUserExtra>,
    @InjectRepository(UserProject) private readonly userProjectRepo: Repository<UserProject>,
    @InjectRepository(SysUser) private readonly userRepo: Repository<SysUser>,
    @InjectRepository(SysDictData) private readonly dictRepo: Repository<SysDictData>
  ) { }

  async onModuleInit() {
    try {
      const rows: any[] = await this.projectRepo.query("SHOW COLUMNS FROM t_project LIKE 'category'")
      if (!rows || rows.length === 0) {
        await this.projectRepo.query("ALTER TABLE t_project ADD COLUMN category varchar(64) NULL")
      }
    } catch { }
  }

  async hall(pageNo = 1, pageSize = 10, distance = 200000, longitude?: number, latitude?: number) {
    const page = Number(pageNo)
    const size = Number(pageSize)
    if (longitude != null && latitude != null) {
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
    const [recordsRaw, total] = await this.projectRepo.findAndCount({
      where: { status: 1, auditStatus: 1 },
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

  async list(name: string | undefined, pageNo = 1, pageSize = 10, publisherId?: string) {
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

  async detail(id: string) {
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
    const projectUserVOList = ups.map((up) => ({ name: userMap.get(up.uid)?.userName, phone: userMap.get(up.uid)?.phonenumber, takeTime: up.takeTime }))
    return { ...rest, projectName: name, status: statusText, auditStatus: auditText, auditRemark, createTime, annexList: annexes, projectUserVOList }
  }

  async push(id: string, status: number) {
    const proj = await this.projectRepo.findOne({ where: { id } })
    if (!proj) return false
    await this.projectRepo.update({ id }, { status })
    return true
  }

  async delete(id: string) {
    await this.projectRepo.delete({ id })
    await this.annexRepo.delete({ projectId: id })
    return true
  }

  async add(files: Express.Multer.File[] | undefined, body: any) {
    const name = body?.projectName || body?.name || ''
    const technology = body?.technical || body?.technology || ''
    const request = body?.request || ''
    if (files && files.length > 3) throw new HttpException('图片不能超过3张', 400)
    const id = Date.now().toString()
    const userId = body?.publisherId || '0'
    const category = body?.category || ''
    await this.projectRepo.save({ id, publisherId: userId, name, technology, request, category, status: 1, auditStatus: 1, createTime: new Date(), updateTime: new Date() })
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
        await this.annexRepo.save({ id: Date.now().toString(), projectId: id, name: file.originalname, path: obj, thumbnail, url })
      }
    }
    return true
  }

  async update(files: Express.Multer.File[] | undefined, body: any) {
    const id = body?.id
    const project = await this.projectRepo.findOne({ where: { id } })
    if (!project) return false
    const annexCount = await this.annexRepo.count({ where: { projectId: id } })
    const addCount = files ? files.length : 0
    if (annexCount + addCount > 3) throw new HttpException('不能超过3张图片', 400)
    await this.projectRepo.update({ id }, { name: body?.projectName || project.name, technology: body?.technical || body?.technology || project.technology, request: body?.request || project.request, category: body?.category ?? project.category, auditStatus: 0, auditRemark: '', updateTime: new Date() })
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
        await this.annexRepo.save({ id: Date.now().toString(), projectId: id, name: project.name, path: obj, thumbnail, url })
      }
    }
    return true
  }

  async myAuditList(pageNo = 1, pageSize = 10, headersOrQuery: Record<string, any>) {
    const user = parseUser((headersOrQuery as any)?._headers || {}) || null
    const auditorIds = await this.dictRepo.createQueryBuilder('d').select(['d.dictLabel']).where('d.dictType = :t', { t: 'project_auditor' }).getMany()
    const auditorSet = new Set(auditorIds.map((d) => String(d.dictLabel)))
    if (!user || !auditorSet.has(String(user.userId))) throw new HttpException('FORBIDDEN', 403)
    const page = Number(pageNo)
    const size = Number(pageSize)
    const [projects, total] = await this.projectRepo.findAndCount({ where: { auditStatus: 0 }, skip: (page - 1) * size, take: size })
    if (!projects.length) return { records: [], total, current: page, size, pages: Math.ceil(total / size) }
    const publisherIds = projects.map((p) => p.publisherId)
    const orgs = await this.userExtraRepo.createQueryBuilder('e').select(['e.userId', 'e.orgName']).where('e.user_id IN (:...ids)', { ids: publisherIds }).getMany()
    const orgMap = new Map<string, string>()
    orgs.forEach((e) => orgMap.set(e.userId, e.orgName))
    const records = projects.map((p) => {
      const { name, ...rest } = p as any
      return { ...rest, projectName: name, auditStatus: '待审核', publisher: orgMap.get(p.publisherId) }
    })
    const pages = Math.ceil(total / size)
    return { records, total, current: page, size, pages }
  }

  async updateAudit(body: any, headersOrQuery: Record<string, any>) {
    const user = parseUser((headersOrQuery as any)?._headers || {}) || null
    const auditorIds = await this.dictRepo.createQueryBuilder('d').select(['d.dictLabel']).where('d.dictType = :t', { t: 'project_auditor' }).getMany()
    const auditorSet = new Set(auditorIds.map((d) => String(d.dictLabel)))
    if (!user || !auditorSet.has(String(user.userId))) throw new HttpException('FORBIDDEN', 403)
    const { projectId, audit, remark = '' } = body
    await this.projectRepo.update({ id: projectId }, { auditStatus: Number(audit), auditRemark: remark })
    return true
  }

  async take(body: any) {
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

  async myTakeList(pageNo = 1, pageSize = 10) {
    const page = Number(pageNo)
    const size = Number(pageSize)
    const [userProjects, total] = await this.userProjectRepo.findAndCount({ where: {}, order: { takeTime: 'DESC' }, skip: (page - 1) * size, take: size })
    if (!userProjects.length) return { records: [], total, current: page, size, pages: Math.ceil(total / size) }
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
    const users = await this.userRepo.createQueryBuilder('u').select(['u.userId', 'u.userName', 'u.phonenumber']).where('u.user_id IN (:...ids)', { ids: publisherIds }).getMany()
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
