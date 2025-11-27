import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity('t_user_project')
export class UserProject {
  @PrimaryColumn({ name: 'id', type: 'bigint' })
  id: string

  @Column({ name: 'uid', type: 'bigint' })
  uid: string

  @Column({ name: 'project_id', type: 'bigint' })
  projectId: string

  @Column({ name: 'status', type: 'int' })
  status: number

  @Column({ name: 'take_time', type: 'date', nullable: true })
  takeTime?: Date
}
