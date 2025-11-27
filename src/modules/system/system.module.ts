import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SysDictData } from '../../entities/sys-dict-data.entity'
import { SystemController } from './system.controller'

@Module({
  imports: [TypeOrmModule.forFeature([SysDictData])],
  controllers: [SystemController],
})
export class SystemModule {}
