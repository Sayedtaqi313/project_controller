import { Injectable } from '@nestjs/common';
import { execFile } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';
import { MigrationDto } from './dto/migration.dto';

const execFilePromise = promisify(execFile);

@Injectable()
export class MigrationService {
  private readonly scriptPath = path.join(
    __dirname,
    '../../scripts/migrate_postgres.sh',
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

    // Set environment variables
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
      const { stdout, stderr } = await execFilePromise(this.scriptPath, args);

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
}
