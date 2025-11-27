import { Controller, Get, Query, UseInterceptors } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SysDictData } from '../../entities/sys-dict-data.entity'
import { ResponseInterceptor } from '../../common/response.interceptor'
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'

@ApiTags('System')
@UseInterceptors(ResponseInterceptor)
@Controller('sys')
export class SystemController {
  constructor(@InjectRepository(SysDictData) private readonly dictRepo: Repository<SysDictData>) {}

  @Get('dict')
  @ApiOperation({ summary: '获取字典数据' })
  @ApiQuery({ name: 'code', required: false, description: '字典类型，默认 sys_technology' })
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
