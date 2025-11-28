import { Controller, Get, Query, UseInterceptors } from '@nestjs/common'
import { ResponseInterceptor } from '../../common/response.interceptor'
import { ApiOperation, ApiQuery, ApiTags, ApiOkResponse } from '@nestjs/swagger'
import { Mock } from '../../common/mock'
import { Public } from '../../common/public.decorator'
import { SystemService } from './system.service'

@ApiTags('System')
@UseInterceptors(ResponseInterceptor)
@Controller('sys')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('sms')
  @Public()
  @ApiOperation({ summary: '发送短信验证码（5分钟有效）' })
  @ApiQuery({ name: 'phone', required: true, description: '手机号', example: '13565888888' })
  @ApiOkResponse({ description: '成功', content: { 'application/json': { example: Mock.system.sms } } })
  async sendSms(@Query('phone') phone?: string) {
    return this.systemService.sendSms(phone)
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
    return this.systemService.getDict(code)
  }
}
