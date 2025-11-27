import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity('t_project_annex')
export class ProjectAnnex {
  @PrimaryColumn({ name: 'id', type: 'bigint' })
  id: string

  @Column({ name: 'project_id', type: 'bigint' })
  projectId: string

  @Column({ name: 'name', type: 'varchar', length: 50 })
  name: string

  @Column({ name: 'path', type: 'varchar', length: 200 })
  path: string

  @Column({ name: 'thumbnail', type: 'blob', nullable: true })
  thumbnail?: Buffer

  @Column({ name: 'url', type: 'varchar', length: 255, nullable: true })
  url?: string

  @Column({ name: 'expire_time', type: 'datetime', nullable: true })
  expireTime?: Date
}
