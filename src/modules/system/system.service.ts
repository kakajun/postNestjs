import { Injectable, HttpException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SysDictData } from '../../entities/sys-dict-data.entity'
import { SmsService } from '../../common/sms.service'

@Injectable()
export class SystemService {
  constructor(
    @InjectRepository(SysDictData) private readonly dictRepo: Repository<SysDictData>,
    private readonly smsService: SmsService
  ) { }

  async sendSms(phone?: string) {
    const p = (phone || '').trim()
    if (!p) throw new HttpException('手机号不能为空', 400)
    if (!this.smsService.rateLimitCheck()) throw new HttpException('操作太频繁', 429)
    const randCode = Math.floor(10000 + Math.random() * 90000)
    this.smsService.clear(p)
    this.smsService.set(p, String(randCode))
    return randCode
  }

  async getDict(code?: string) {
    const dictType = code && code.trim() ? code : 'sys_technology'
    const list = await this.dictRepo.find({
      where: { dictType },
      select: ['dictCode', 'fatherId', 'dictType', 'dictLabel', 'dictValue', 'remark'],
      order: { dictSort: 'ASC' },
    })
    return list.map((d) => ({
      id: d.dictCode,
      dictLabel: d.dictLabel,
      dictType: d.dictType,
      dictValue: d.dictValue,
      fatherId: d.fatherId,
      remark: d.remark,
    }))
  }
}
