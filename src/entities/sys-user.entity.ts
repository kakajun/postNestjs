import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity('sys_user')
export class SysUser {
  @PrimaryColumn({ name: 'user_id', type: 'bigint' })
  userId: string

  @Column({ name: 'user_name', type: 'varchar', length: 50 })
  userName: string

  @Column({ name: 'phonenumber', type: 'varchar', length: 20, nullable: true })
  phonenumber?: string

  @Column({ name: 'status', type: 'int', nullable: true })
  status?: number
}
