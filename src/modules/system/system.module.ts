import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SysDictData } from '../../entities/sys-dict-data.entity'
import { SystemController } from './system.controller'
import { SystemService } from './system.service'

@Module({
  imports: [TypeOrmModule.forFeature([SysDictData])],
  controllers: [SystemController],
  providers: [SystemService],
})
export class SystemModule {}
