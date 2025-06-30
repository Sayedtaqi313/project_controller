import { Injectable } from '@nestjs/common';
import { execFile } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';
import { MigrationDto } from './dto/migration.dto';

const execFilePromise = promisify(execFile);

@Injectable()
export class MigrationService {
  private readonly fullMigrationScript = path.join(
    __dirname,
    '../../scripts/migrate_postgres.sh',
  );

  private readonly backupScript = path.join(
    __dirname,
    '../../scripts/backup_postgres.sh',
  );

  private readonly restoreScript = path.join(
    __dirname,
    '../../scripts/restore_postgres.sh',
  );

  async executeMigration(
    data: MigrationDto,
  ): Promise<{ message: string; output: string }> {
    const {
      sourceType,
      targetType,
      sourceHost,
      sourcePort,
      sourceDB,
      sourceUser,
      sourcePassword,
      targetHost,
      targetPort,
      targetDB,
      targetUser,
      targetPassword,
    } = data;

    process.env.PGPASSWORD =
      sourceType === 'rds' ? sourcePassword : targetPassword;

    const args = [
      sourceType,
      targetType,
      sourceHost,
      sourcePort,
      sourceDB,
      sourceUser,
      sourcePassword,
      targetHost,
      targetPort,
      targetDB,
      targetUser,
      targetPassword,
    ];

    try {
      const { stdout, stderr } = await execFilePromise(
        this.fullMigrationScript,
        args,
      );

      if (stderr) {
        console.error(`❌ Migration stderr:`, stderr);
        throw new Error(`Migration script error: ${stderr}`);
      }

      console.log(`✅ Migration output: ${stdout}`);
      return { message: 'Migration completed', output: stdout };
    } catch (error) {
      console.error(`❌ Migration failed:`, error);
      throw new Error(`Migration failed: ${error.message}`);
    }
  }

  async backupOnly(
    data: MigrationDto,
  ): Promise<{ message: string; output: string }> {
    const {
      sourceType,
      sourceHost,
      sourcePort,
      sourceDB,
      sourceUser,
      sourcePassword,
    } = data;

    process.env.PGPASSWORD = sourcePassword;

    const args = [
      sourceType,
      sourceHost,
      sourcePort,
      sourceDB,
      sourceUser,
      sourcePassword,
    ];

    try {
      const { stdout, stderr } = await execFilePromise(this.backupScript, args);

      if (stderr) {
        console.error(`❌ Backup stderr:`, stderr);
        throw new Error(`Backup script error: ${stderr}`);
      }

      console.log(`✅ Backup output: ${stdout}`);
      return { message: 'Backup completed', output: stdout };
    } catch (error) {
      console.error(`❌ Backup failed:`, error);
      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  async restoreOnly(
    data: MigrationDto,
  ): Promise<{ message: string; output: string }> {
    const {
      targetType,
      targetHost,
      targetPort,
      targetDB,
      targetUser,
      targetPassword,
    } = data;

    process.env.PGPASSWORD = targetPassword;

    const args = [
      targetType,
      targetHost,
      targetPort,
      targetDB,
      targetUser,
      targetPassword,
    ];

    try {
      const { stdout, stderr } = await execFilePromise(
        this.restoreScript,
        args,
      );

      if (stderr) {
        console.error(`❌ Restore stderr:`, stderr);
        throw new Error(`Restore script error: ${stderr}`);
      }

      console.log(`✅ Restore output: ${stdout}`);
      return { message: 'Restore completed', output: stdout };
    } catch (error) {
      console.error(`❌ Restore failed:`, error);
      throw new Error(`Restore failed: ${error.message}`);
    }
  }
}
