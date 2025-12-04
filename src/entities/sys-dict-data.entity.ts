import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('sys_dict_data')
export class SysDictData {
  @PrimaryGeneratedColumn({ name: 'dict_code', type: 'bigint' })
  dictCode: string

  @Column({ name: 'father_id', type: 'bigint', nullable: true })
  fatherId?: string

  @Column({ name: 'dict_sort', type: 'int', nullable: true })
  dictSort?: number

  @Column({ name: 'dict_label', type: 'varchar', length: 100 })
  dictLabel: string

  @Column({ name: 'dict_value', type: 'varchar', length: 100 })
  dictValue: string

  @Column({ name: 'dict_type', type: 'varchar', length: 100 })
  dictType: string

  @Column({ name: 'status', type: 'varchar', length: 10, default: '0' })
  status: string

  @Column({ name: 'remark', type: 'varchar', length: 255, nullable: true })
  remark?: string
}
