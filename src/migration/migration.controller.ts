import { Controller, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';

import { MigrationService } from './migration.service';
import { MigrationDto } from './dto/migration.dto';

@Controller('migration')
@ApiTags('migration')
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  @Post('migrate-db')
  @ApiOperation({
    summary: 'Migrate full database',
    description: 'Backs up from source and restores to target in one step.',
  })
  @ApiBody({ type: MigrationDto })
  @ApiResponse({
    status: 200,
    description: 'Migration completed',
    schema: {
      example: {
        message: 'Migration completed',
        output: 'Database copied from docker to rds',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Migration failed',
  })
  async migrateDatabase(
    @Body() migrationData: MigrationDto,
    @Res() res: Response,
  ) {
    try {
      const result =
        await this.migrationService.executeMigration(migrationData);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  @Post('backup-db')
  @ApiOperation({
    summary: 'Backup database',
    description: 'Only backs up from the source database to a dump file.',
  })
  @ApiBody({ type: MigrationDto })
  @ApiResponse({
    status: 200,
    description: 'Backup completed',
    schema: {
      example: {
        message: 'Backup completed',
        output: 'Dump file saved to /home/ubuntu/backups/db_backup.dump',
      },
    },
  })
  async backupDatabase(
    @Body() migrationData: MigrationDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.migrationService.backupOnly(migrationData);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  @Post('restore-db')
  @ApiOperation({
    summary: 'Restore database',
    description: 'Restores from existing dump file to the target database.',
  })
  @ApiBody({ type: MigrationDto })
  @ApiResponse({
    status: 200,
    description: 'Restore completed',
    schema: {
      example: {
        message: 'Restore completed',
        output: 'Restored into RDS successfully',
      },
    },
  })
  async restoreDatabase(
    @Body() migrationData: MigrationDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.migrationService.restoreOnly(migrationData);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
}
