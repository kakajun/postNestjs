import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Project } from '../../entities/project.entity'
import { ProjectAnnex } from '../../entities/project-annex.entity'
import { SysUserExtra } from '../../entities/sys-user-extra.entity'
import { UserProject } from '../../entities/user-project.entity'
import { SysUser } from '../../entities/sys-user.entity'
import { SysDictData } from '../../entities/sys-dict-data.entity'
import { ProjectController } from './project.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Project, ProjectAnnex, SysUserExtra, UserProject, SysUser, SysDictData])],
  controllers: [ProjectController],
})
export class ProjectModule {}
