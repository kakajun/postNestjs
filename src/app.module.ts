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
import { UserModule } from './modules/user/user.module'
import { FileModule } from './modules/file/file.module'
import { CommonModule } from './common/common.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST as string,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USER as string,
      password: process.env.DB_PASS as string,
      database: process.env.DB_NAME as string,
      entities: [SysDictData, Project, ProjectAnnex, SysUser, SysUserExtra],
      synchronize: false,
      logging: false,
    }),
    SystemModule,
    CommonModule,
    ProjectModule,
    FileModule,
    UserModule,
  ],
})
export class AppModule {}
