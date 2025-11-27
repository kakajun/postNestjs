import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity('sys_user_extra')
export class SysUserExtra {
  @PrimaryColumn({ name: 'id', type: 'bigint' })
  id: string

  @Column({ name: 'user_id', type: 'bigint' })
  userId: string

  @Column({ name: 'org_type', type: 'int', nullable: true })
  orgType?: number

  @Column({ name: 'org_name', type: 'varchar', length: 100, nullable: true })
  orgName?: string

  @Column({ name: 'technology', type: 'text', nullable: true })
  technology?: string

  @Column({ name: 'technology_tag', type: 'varchar', length: 255, nullable: true })
  technologyTag?: string

  @Column({ name: 'token_sign', type: 'varchar', length: 64, nullable: true })
  tokenSign?: string

  @Column({ name: 'latitude', type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude?: string

  @Column({ name: 'longitude', type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude?: string
}
