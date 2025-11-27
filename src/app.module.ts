import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SysDictData } from './entities/sys-dict-data.entity'
import { Project } from './entities/project.entity'
import { ProjectAnnex } from './entities/project-annex.entity'
import { SysUser } from './entities/sys-user.entity'
import { SysUserExtra } from './entities/sys-user-extra.entity'
import { SystemModule } from './modules/system/system.module'
import { ProjectModule } from './modules/project/project.module'
import { FileModule } from './modules/file/file.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '123123',
      database: process.env.DB_NAME || 'ry-vue',
      entities: [SysDictData, Project, ProjectAnnex, SysUser, SysUserExtra],
      synchronize: false,
      logging: false,
    }),
    SystemModule,
    ProjectModule,
    FileModule,
  ],
})
export class AppModule { }
