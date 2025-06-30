import { ApiProperty } from '@nestjs/swagger';

export class MigrationDto {
  @ApiProperty({
    example: 'rds',
    description: 'Type of the source database (e.g., rds, local)',
  })
  sourceType: string;

  @ApiProperty({
    example: 'local',
    description: 'Type of the target database (e.g., local, docker)',
  })
  targetType: string;

  @ApiProperty({
    example: 'localhost',
    description: 'Host address of the source database',
  })
  sourceHost: string;

  @ApiProperty({ example: '5432', description: 'Port of the source database' })
  sourcePort: string;

  @ApiProperty({ example: 'mydb', description: 'Name of the source database' })
  sourceDB: string;

  @ApiProperty({
    example: 'postgres',
    description: 'Username for the source database',
  })
  sourceUser: string;

  @ApiProperty({
    example: 'sourcePassword123',
    description: 'Password for the source database',
  })
  sourcePassword: string;

  @ApiProperty({
    example: 'localhost',
    description: 'Host address of the target database',
  })
  targetHost: string;

  @ApiProperty({ example: '5433', description: 'Port of the target database' })
  targetPort: string;

  @ApiProperty({
    example: 'mydb_new',
    description: 'Name of the target database',
  })
  targetDB: string;

  @ApiProperty({
    example: 'postgres',
    description: 'Username for the target database',
  })
  targetUser: string;

  @ApiProperty({
    example: 'targetPassword123',
    description: 'Password for the target database',
  })
  targetPassword: string;
}
