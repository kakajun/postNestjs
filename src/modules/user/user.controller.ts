import { Body, Controller, Get, Headers, Post, UseInterceptors } from '@nestjs/common'
import { ResponseInterceptor } from '../../common/response.interceptor'
import { ApiBody, ApiOperation, ApiTags, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger'
import { Mock } from '../../common/mock'
import { Public } from '../../common/public.decorator'
import { UserService } from './user.service'

@ApiTags('User')
@UseInterceptors(ResponseInterceptor)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('login')
  @Public()
  @ApiOperation({ summary: '登录' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        phone: { type: 'string' },
        captcha: { type: 'string' },
        userType: { type: 'string' },
      },
    },
    examples: {
      demo: { value: { phone: '13565888888', captcha: '32280', userType: '01' } },
    },
  })
  @ApiOkResponse({ description: '成功', content: { 'application/json': { example: Mock.user.login } } })
  async login(@Body() body: any) {
    return this.userService.login(body)
  }

  @Post('register')
  @Public()
  @ApiOperation({ summary: '用户注册' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        phone: { type: 'string' },
        captcha: { type: 'string' },
        userName: { type: 'string' },
        orgType: { type: 'integer' },
        orgName: { type: 'string' },
        technology: { type: 'string' },
      },
    },
    examples: {
      demo: {
        value: {
          phone: '13565888888',
          captcha: '32280',
          userName: 'HL',
          orgType: 0,
          orgName: 'HL',
          technology: 'Java,NestJS',
        },
      },
    },
  })
  @ApiOkResponse({ description: '成功', content: { 'application/json': { example: Mock.user.register } } })
  async register(@Body() body: any) {
    return this.userService.register(body)
  }

  @Post('info')
  @ApiOperation({ summary: '我的资料' })
  @ApiBody({
    schema: { type: 'object', properties: { token: { type: 'string' } } },
    examples: { demo: { value: { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' } } },
  })
  @ApiOkResponse({ description: '成功', content: { 'application/json': { example: Mock.user.info } } })
  async info(@Body() _body: any) {
    return this.userService.info(_body)
  }

  @Get('info')
  @ApiOperation({ summary: '我的资料（GET，从头部解析）' })
  @ApiBearerAuth('bearer')
  @ApiOkResponse({ description: '成功', content: { 'application/json': { example: Mock.user.info } } })
  async infoGet(@Headers() headers: Record<string, any>) {
    return this.userService.infoGet(headers)
  }

  @Post('logout')
  @ApiOperation({ summary: '退出登录' })
  @ApiBearerAuth('bearer')
  @ApiOkResponse({ description: '成功', content: { 'application/json': { example: Mock.user.logout } } })
  async logout(@Headers() headers: Record<string, any>) {
    return this.userService.logout(headers)
  }
}
