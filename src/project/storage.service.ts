import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import { DockerService } from './docker.service';
import { Project } from './entities/project.entity';

const execPromise = promisify(exec);

@Injectable()
export class StorageService {
  constructor(private readonly dockerService: DockerService) {}

  private async getDockerContainerSize(containerName: string): Promise<number> {
    try {
      const { stdout } = await execPromise(`du -sb ${containerName} | cut -f1`);
      const sizeString = stdout.trim();
      return parseFloat(sizeString) || 0;
    } catch (error) {
      console.error('Error getting container size:', error);
      return 0;
    }
  }

  private async getVolumeSize(volumePath: string): Promise<number> {
    try {
      const { stdout } = await execPromise(
        `sudo du -sb ${volumePath} | cut -f1`,
      );
      const bytes = parseInt(stdout.trim());
      return bytes;
    } catch (error) {
      console.error('Error getting volume size:', error);
      return 0;
    }
  }

  private async getStorageUsage(path: string): Promise<string> {
    try {
      const { stdout } = await execPromise(`du -sh ${path} | cut -f1`);
      return stdout.trim();
    } catch (error) {
      console.error(`Error getting storage usage for ${path}:`, error);
      return '0B';
    }
  }

  async getDiskInfo(targetPath = '/home/ubuntu/app/'): Promise<any> {
    try {
      const { stdout } = await execPromise(`df -h ${targetPath}`);
      const lines = stdout.trim().split('\n');
      const headers = lines[0].split(/\s+/);
      const values = lines[1].split(/\s+/);

      const result: Record<string, string> = {};
      headers.forEach((header, i) => {
        result[header.toLowerCase()] = values[i];
      });

      if (result['use%']) {
        result.free_percentage = (100 - parseInt(result['use%'])).toString();
      }

      return result;
    } catch (error) {
      console.error(`Error getting disk info for ${targetPath}:`, error);
      return {
        'use%': '0%',
        free_percentage: '100',
      };
    }
  }

  async getProjectStateInfo(project: Project): Promise<any> {
    const projectPath = `/home/ubuntu/app/${project.name}`;
    const volumePath = `/opt/${project.name}/postgres-data`;

    const pathsExist = {
      project_path: fs.existsSync(projectPath),
      volume_path: fs.existsSync(volumePath),
    };

    const [containerSize, volumeSize, diskInfo] = await Promise.all([
      this.getDockerContainerSize(projectPath),
      this.getVolumeSize(volumePath),
      this.getDiskInfo(projectPath),
    ]);

    const GbToByte = 1073741824;
    const allocatedSpace = Number(project.storage) * GbToByte || 0;
    const totalUsedSpace = containerSize + volumeSize;
    const freeSpace = Math.max(0, allocatedSpace - totalUsedSpace);

    const formatBytesToMbOrGb = (bytes: number): string => {
      const MB = bytes / (1024 * 1024);
      return MB >= 1024 ? `${(MB / 1024).toFixed(2)}G` : `${MB.toFixed(2)}M`;
    };

    const cpuUsedPercent = this.dockerService.getDockerCpuUsage(project.name);
    const memoryUsedMB = this.dockerService.getDockerMemoryUsage(project.name);

    return {
      paths: {
        application: projectPath,
        volume: volumePath,
        exists: pathsExist,
      },
      usage: {
        total: formatBytesToMbOrGb(allocatedSpace),
        used: formatBytesToMbOrGb(totalUsedSpace),
        free: formatBytesToMbOrGb(freeSpace),
        container: formatBytesToMbOrGb(containerSize),
        volume: formatBytesToMbOrGb(volumeSize),
      },
      filesystem: diskInfo,
      resources: {
        cpuAllocated: (Number(project.cpu) / 1000).toFixed(1),
        cpuUsedPercent: cpuUsedPercent?.toFixed(2) || '0.00',
        memoryAllocated: (Number(project.memory) / 1024).toFixed(2),
        memoryUsedMB: memoryUsedMB?.toFixed(2) || '0.00',
      },
    };
  }
}
