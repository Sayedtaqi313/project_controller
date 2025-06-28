import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn()
  @ApiProperty({
    example: 1,
    description: 'The unique identifier of the project',
  })
  id: number;

  @Column()
  @ApiProperty({
    example: 'my-project',
    description: 'The name of the project',
  })
  name: string;

  @Column()
  @ApiProperty({
    example: '/home/ubuntu/app/my-project',
    description: 'The file path to the project',
  })
  path: string;

  @Column()
  @ApiProperty({ example: '2', description: 'CPU allocation for the project' })
  cpu: string;

  @Column()
  @ApiProperty({
    example: '10GB',
    description: 'Storage allocation for the project',
  })
  storage: string;

  @Column()
  @ApiProperty({
    example: '512MB',
    description: 'Memory allocation for the project',
  })
  memory: string;
}
