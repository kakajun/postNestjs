import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserController } from './user.controller'
import { SysUser } from '../../entities/sys-user.entity'
import { SysUserExtra } from '../../entities/sys-user-extra.entity'
import { SysDictData } from '../../entities/sys-dict-data.entity'

@Module({
  imports: [TypeOrmModule.forFeature([SysUser, SysUserExtra, SysDictData])],
  controllers: [UserController],
  providers: [],
})
export class UserModule { }
