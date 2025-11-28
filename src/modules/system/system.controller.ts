import { Controller, Get, HttpException, Query, UseInterceptors } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SysDictData } from '../../entities/sys-dict-data.entity'
import { ResponseInterceptor } from '../../common/response.interceptor'
import { ApiOperation, ApiQuery, ApiTags, ApiOkResponse } from '@nestjs/swagger'
import { Mock } from '../../common/mock'
import { SmsService } from '../../common/sms.service'
import { Public } from '../../common/public.decorator'

@ApiTags('System')
@UseInterceptors(ResponseInterceptor)
@Controller('sys')
export class SystemController {
  constructor(
    @InjectRepository(SysDictData) private readonly dictRepo: Repository<SysDictData>,
    private readonly smsService: SmsService
  ) {}

  @Get('sms')
  @Public()
  @ApiOperation({ summary: '发送短信验证码（5分钟有效）' })
  @ApiQuery({ name: 'phone', required: true, description: '手机号', example: '13565888888' })
  @ApiOkResponse({ description: '成功', content: { 'application/json': { example: Mock.system.sms } } })
  async sendSms(@Query('phone') phone?: string) {
    const p = (phone || '').trim()
    if (!p) throw new HttpException('手机号不能为空', 400)
    if (!this.smsService.rateLimitCheck()) throw new HttpException('操作太频繁', 429)
    const randCode = Math.floor(10000 + Math.random() * 90000)
    this.smsService.clear(p)
    this.smsService.set(p, String(randCode))
    return randCode
  }

  @Get('dict')
  @Public()
  @ApiOperation({ summary: '获取字典数据' })
  @ApiQuery({
    name: 'code',
    required: false,
    description: '字典类型，默认 sys_technology',
    example: 'sys_technology',
  })
  @ApiOkResponse({ description: '成功', content: { 'application/json': { example: Mock.system.dict } } })
  async getDict(@Query('code') code?: string) {
    const dictType = code && code.trim() ? code : 'sys_technology'
    const list = await this.dictRepo.find({
      where: { dictType },
      select: ['dictCode', 'fatherId', 'dictType', 'dictSort', 'dictLabel', 'dictValue', 'status'],
      order: { dictSort: 'ASC' },
    })
    return list
  }
}
