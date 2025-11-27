import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity('t_project')
export class Project {
  @PrimaryColumn({ name: 'id', type: 'bigint' })
  id: string

  @Column({ name: 'publisher_id', type: 'bigint' })
  publisherId: string

  @Column({ name: 'name', type: 'varchar', length: 50 })
  name: string

  @Column({ name: 'technology', type: 'text' })
  technology: string

  @Column({ name: 'request', type: 'text' })
  request: string

  @Column({ name: 'category', type: 'varchar', length: 64, nullable: true })
  category?: string

  @Column({ name: 'status', type: 'int', nullable: true })
  status?: number

  @Column({ name: 'audit_status', type: 'int', nullable: true })
  auditStatus?: number

  @Column({ name: 'audit_remark', type: 'varchar', length: 255, nullable: true })
  auditRemark?: string

  @Column({ name: 'create_time', type: 'datetime', nullable: true })
  createTime?: Date

  @Column({ name: 'update_time', type: 'datetime', nullable: true })
  updateTime?: Date
}
