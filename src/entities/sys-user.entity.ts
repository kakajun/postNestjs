import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('sys_user')
export class SysUser {
  @PrimaryGeneratedColumn({ name: 'user_id', type: 'bigint' })
  userId: string

  @Column({ name: 'user_name', type: 'varchar', length: 50 })
  userName: string

  @Column({ name: 'nick_name', type: 'varchar', length: 50 })
  nickName: string

  @Column({ name: 'phonenumber', type: 'varchar', length: 20, nullable: true })
  phonenumber?: string

  @Column({ name: 'dept_id', type: 'bigint', nullable: true })
  deptId?: string

  @Column({ name: 'status', type: 'int', nullable: true })
  status?: number
}
