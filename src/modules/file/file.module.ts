import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { FileController } from './file.controller'
import { FileService } from './file.service'
import { ProjectAnnex } from '../../entities/project-annex.entity'

@Module({
  imports: [TypeOrmModule.forFeature([ProjectAnnex])],
  controllers: [FileController],
  providers: [FileService],
})
export class FileModule {}
