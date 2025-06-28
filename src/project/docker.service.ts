import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { Project } from './entities/project.entity';

const execPromise = promisify(exec);

@Injectable()
export class DockerService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  async runComposeCommand(projectId: string, composeCommand: string) {
    const project = await this.projectRepository.findOne({
      where: { id: Number(projectId) },
    });

    if (!project) throw new Error('Project not found');

    const projectPath = path.join('/home/ubuntu/app', project.name);
    const volumePath = path.join('/opt', project.name, 'postgres-data');

    if (!fs.existsSync(projectPath)) {
      throw new Error(`Project directory not found at ${projectPath}`);
    }

    const composeFilePath = path.join(projectPath, 'docker-compose.yml');
    if (!fs.existsSync(composeFilePath)) {
      throw new Error(`docker-compose.yml not found in ${projectPath}`);
    }

    let command: string;
    if (composeCommand === 'up') {
      const envFilePath = path.join(projectPath, '.env');
      if (!fs.existsSync(envFilePath)) {
        throw new Error(`.env file not found at ${envFilePath}`);
      }
      command = `DOCKER_BUILDKIT=1 COMPOSE_DOCKER_CLI_BUILD=1 docker compose -f ${composeFilePath} --env-file ${envFilePath} up -d --build`;
    } else if (composeCommand === 'down') {
      command = `COMPOSE_DOCKER_CLI_BUILD=1 docker compose -f ${composeFilePath} down`;
    } else {
      throw new Error(`Invalid compose command: ${composeCommand}`);
    }

    try {
      console.log(`Executing in ${projectPath}: ${command}`);
      const { stdout, stderr } = await execPromise(command, {
        cwd: projectPath,
        env: { ...process.env, COMPOSE_PROJECT_NAME: project.name },
      });

      return {
        success: true,
        stdout,
        stderr,
        returncode: stderr ? 1 : 0,
      };
    } catch (error) {
      console.error(`Error executing command: ${error.message}`);
      throw new Error(`Failed to ${composeCommand} project: ${error.message}`);
    }
  }

  getDockerCpuUsage(projectName: string): number | null {
    try {
      const output = execSync(
        `docker stats --no-stream --format "{{.Name}}:{{.CPUPerc}}"`,
        { encoding: 'utf-8' },
      );

      const lines = output.trim().split('\n');
      let totalCpu = 0;

      lines.forEach((line) => {
        const [name, percent] = line.split(':');
        if (name.includes(projectName)) {
          const cpuValue = parseFloat(percent.replace('%', '')) || 0;
          totalCpu += cpuValue;
        }
      });

      return totalCpu;
    } catch (err) {
      console.error('Error getting Docker CPU stats:', err.message);
      return null;
    }
  }

  getDockerMemoryUsage(projectName: string): number | null {
    try {
      const output = execSync(
        `docker stats --no-stream --format "{{.Name}}:{{.MemUsage}}"`,
        { encoding: 'utf-8' },
      );

      let totalUsedMb = 0;

      output
        .trim()
        .split('\n')
        .forEach((line) => {
          const [name, usage] = line.split(':');
          if (name.includes(projectName)) {
            const match = usage.match(/([\d.]+)([a-zA-Z]+)/);
            if (match) {
              let value = parseFloat(match[1]);
              const unit = match[2].toLowerCase();

              if (unit === 'gib' || unit === 'gb') value *= 1024;
              else if (unit === 'kib' || unit === 'kb') value /= 1024;

              totalUsedMb += value;
            }
          }
        });

      return totalUsedMb;
    } catch (err) {
      console.error('Error getting Docker memory stats:', err.message);
      return null;
    }
  }
}
