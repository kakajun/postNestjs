import { Injectable, HttpException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SysUser } from '../../entities/sys-user.entity'
import { SysUserExtra } from '../../entities/sys-user-extra.entity'
import { SysDictData } from '../../entities/sys-dict-data.entity'
import { SmsService } from '../../common/sms.service'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { parseUser } from '../../common/jwt.util'

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(SysUser) private readonly userRepo: Repository<SysUser>,
    @InjectRepository(SysUserExtra) private readonly userExtraRepo: Repository<SysUserExtra>,
    @InjectRepository(SysDictData) private readonly dictRepo: Repository<SysDictData>,
    private readonly smsService: SmsService
  ) { }

  async login(body: any) {
    const phone = (body?.phone || '').trim()
    const captcha = (body?.captcha || '').trim()
    const userType = String(body?.userType || '')
    if (!phone) throw new HttpException('手机号不能为空', 400)
    if (!captcha) throw new HttpException('验证码不能为空', 400)
    const accessCode = this.smsService.get(phone)
    if (!accessCode) throw new HttpException('验证码已过期，请重新获取', 400)
    if (accessCode !== captcha) throw new HttpException('验证码不正确', 400)
    const sysUser = await this.userRepo.findOne({ where: { phonenumber: phone }, select: ['userId', 'status'] })
    if (!sysUser) throw new HttpException('该手机号未注册', 400)
    const statusStr = String(sysUser.status ?? '0')
    if (statusStr !== '0') throw new HttpException('账号已停用，请联系管理员', 403)
    const content = JSON.stringify({ userId: sysUser.userId, userType })
    const secret = process.env.JWT_SECRET as string
    if (!secret) throw new HttpException('服务端未配置 JWT_SECRET', 500)
    const expiresIn = '7d'
    const token = jwt.sign({ content }, secret, { expiresIn })
    const md5Hex = crypto.createHash('md5').update(token).digest('hex')
    await this.userExtraRepo.update({ userId: sysUser.userId }, { tokenSign: md5Hex })
    this.smsService.clear(phone)
    const auditorIds = await this.dictRepo
      .createQueryBuilder('d')
      .select(['d.dictLabel'])
      .where('d.dictType = :t', { t: 'project_auditor' })
      .getMany()
    const set = new Set(auditorIds.map((d) => String(d.dictLabel)))
    const isAuditor = set.has(String(sysUser.userId))
    return { token, isAuditor }
  }

  async register(body: any) {
    const phone = (body?.phone || '').trim()
    const captcha = (body?.captcha || '').trim()
    const userName = (body?.userName || '').trim()
    if (!phone) throw new HttpException('手机号不能为空', 400)
    if (!captcha) throw new HttpException('验证码不能为空', 400)
    if (!userName) throw new HttpException('用户名不能为空', 400)
    const accessCode = this.smsService.get(phone)
    if (!accessCode) throw new HttpException('验证码已过期，请重新获取', 400)
    if (accessCode !== captcha) throw new HttpException('验证码不正确', 400)
    const count = await this.userRepo.count({ where: { phonenumber: phone } })
    if (count !== 0) throw new HttpException('该手机号已注册', 400)
    const deptId = (process.env.WB_DEPT_ID as string) || undefined
    const user = this.userRepo.create({ userName, nickName: body?.nickName || userName, phonenumber: phone, deptId, status: 0 })
    const saved = await this.userRepo.save(user)
    const extra = this.userExtraRepo.create({ id: Date.now().toString(), userId: saved.userId, orgType: body?.orgType, orgName: body?.orgName, technology: body?.technology })
    await this.userExtraRepo.save(extra)
    this.smsService.clear(phone)
    return true
  }

  async info(body: any) {
    const secret = process.env.JWT_SECRET as string
    if (!secret) throw new HttpException('服务端未配置 JWT_SECRET', 500)
    const token = body?.token || ''
    if (!token) throw new HttpException('未登录', 401)
    const payload: any = jwt.verify(token, secret, { ignoreExpiration: true })
    const content = payload?.content ? JSON.parse(payload.content) : payload
    const userId = String(content?.userId || '')
    if (!userId) throw new HttpException('未登录', 401)
    const byId = await this.userRepo.findOne({ where: { userId }, select: ['userId', 'userName', 'nickName', 'phonenumber', 'deptId', 'status'] })
    const extra = await this.userExtraRepo.findOne({ where: { userId }, select: ['orgType', 'orgName', 'technology', 'technologyTag', 'latitude', 'longitude'] })
    if (!byId) throw new HttpException('用户不存在', 404)
    const resp = {
      phone: byId.phonenumber,
      orgType: extra?.orgType,
      orgName: extra?.orgName,
      name: byId.userName,
      avatarUrl: '',
      technology: extra?.technology,
      latitude: extra?.latitude,
      longitude: extra?.longitude,
      technologyTag: extra?.technologyTag,
    }
    return resp
  }

  async infoGet(headers: Record<string, any>) {
    const user = parseUser(headers)
    if (!user?.userId) throw new HttpException('未登录', 401)
    const userId = user.userId
    const byId = await this.userRepo.findOne({ where: { userId }, select: ['userId', 'userName', 'nickName', 'phonenumber', 'deptId', 'status'] })
    const extra = await this.userExtraRepo.findOne({ where: { userId }, select: ['orgType', 'orgName', 'technology', 'technologyTag', 'latitude', 'longitude'] })
    if (!byId) throw new HttpException('用户不存在', 404)
    const resp = {
      phone: byId.phonenumber,
      orgType: extra?.orgType,
      orgName: extra?.orgName,
      name: byId.userName,
      avatarUrl: '',
      technology: extra?.technology,
      latitude: extra?.latitude,
      longitude: extra?.longitude,
      technologyTag: extra?.technologyTag,
    }
    return resp
  }
}
