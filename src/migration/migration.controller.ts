import { Controller, Post, Body } from '@nestjs/common';
import { MigrationService } from './migration.service';
import { MigrationDto } from './dto/migration.dto';

@Controller('migration')
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  @Post('migrate-db')
  async migrateDatabase(@Body() migrationData: MigrationDto) {
    return this.migrationService.executeMigration(migrationData);
  }
}
