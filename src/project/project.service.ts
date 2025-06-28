import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as os from 'os';
import * as osu from 'os-utils';
import * as si from 'systeminformation';
import { Project } from './entities/project.entity';
import { DockerService } from './docker.service';
import { StorageService } from './storage.service';
import { LimitationService } from './limitation.service';
import { execSync } from 'child_process';
import * as fs from 'fs';

@Injectable()
export class ProjectService {
  private logger = new Logger(ProjectService.name);
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    private dockerService: DockerService,
    private storageService: StorageService,
    private limitationService: LimitationService,
  ) {}

  async startProject(projectId: string) {
    if (!projectId) throw new Error('Project id is required');
    return this.dockerService.runComposeCommand(projectId, 'up');
  }

  async stopProject(projectId: string) {
    if (!projectId) throw new Error('Project Id is required');
    return this.dockerService.runComposeCommand(projectId, 'down');
  }

  async getProjectStorage(projectId: string) {
    if (!projectId || isNaN(Number(projectId))) {
      throw new Error('Valid project ID is required');
    }

    const project = await this.projectRepository.findOne({
      where: { id: Number(projectId) },
    });
    if (!project) throw new Error('Project not found');

    return this.storageService.getProjectStateInfo(project);
  }

  async getProjects() {
    const projects = await this.projectRepository.find();
    return Promise.all(
      projects.map(async (project) => {
        try {
          const storageInfo =
            await this.storageService.getProjectStateInfo(project);
          if (storageInfo.usage.used >= storageInfo.usage.total) {
            this.limitationService.limitStorageWrite(project.name);
            console.log('Storage limit exceeded', project.name);
          }
          return { ...project, storageInfo };
        } catch (error) {
          console.error(`Error processing project ${project.id}:`, error);
          return { ...project, storageInfo: null, storageError: error.message };
        }
      }),
    );
  }

  async getEc2InstanceInfo() {
    return this.storageService.getDiskInfo();
  }

  async getSystemStats() {
    return new Promise((resolve, reject) => {
      const uptime = os.uptime();
      const totalMem = os.totalmem() / 1024 / 1024;
      const freeMem = os.freemem() / 1024 / 1024;
      const usedMem = totalMem - freeMem;

      osu.cpuUsage(async (cpuPercent) => {
        try {
          const disk = await si.fsSize();
          const net = await si.networkStats();
          const io = await si.disksIO();
          const info = await this.storageService.getDiskInfo();

          resolve({
            data: info,
            os: {
              platform: os.platform(),
              arch: os.arch(),
              hostname: os.hostname(),
              release: os.release(),
              uptimeSeconds: uptime,
            },
            cpu: {
              model: os.cpus()[0].model,
              speed: os.cpus()[0].speed,
              cores: os.cpus().length,
              load: os.loadavg(),
              cpuUsagePercent: (cpuPercent * 100).toFixed(2),
              cpuCurrentSpeed: (await si.cpuCurrentSpeed()).avg,
              cpuCache: await si.cpuCache(),
              cpu: await si.cpu(),
            },
            memory: {
              totalMB: totalMem.toFixed(2),
              usedMB: usedMem.toFixed(2),
              freeMB: freeMem.toFixed(2),
            },
            disk: disk.map((d) => ({
              fs: d.fs,
              type: d.type,
              sizeGB: (d.size / 1024 / 1024 / 1024).toFixed(2),
              usedGB: (d.used / 1024 / 1024 / 1024).toFixed(2),
              usePercent: d.use,
              mount: d.mount,
            })),
            network: net.map((n) => ({
              iface: n.iface,
              rxMBps: (n.rx_bytes / 1024 / 1024).toFixed(2),
              txMBps: (n.tx_bytes / 1024 / 1024).toFixed(2),
            })),
            diskIO: {
              readMB: (io.rIO / 1024 / 1024).toFixed(2),
              writeMB: (io.wIO / 1024 / 1024).toFixed(2),
            },
          });
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  async deleteProjectResources(
    projectName: string,
  ): Promise<{ message: string }> {
    const projectPath = `/home/ubuntu/app/${projectName}`;
    const volumeName = `${projectName}_postgres-data`;
    const volumePath = `/opt/${projectName}`;
    const cgroupPath = `/sys/fs/cgroup/${projectName}`;
    const nginxConfig = `/etc/nginx/sites-available/${projectName}`;
    const nginxEnabledLink = `/etc/nginx/sites-enabled/${projectName}`;

    try {
      this.logger.log('🔧 Stopping and removing Docker containers...');
      execSync(
        `docker compose -f ${projectPath}/docker-compose.yml down --rmi all -v`,
        {
          stdio: 'inherit',
        },
      );

      this.logger.log('🧹 Deleting Docker volume if exists...');
      try {
        execSync(`docker volume rm -f ${volumeName}`, { stdio: 'inherit' });
      } catch (error) {
        this.logger.warn(`⚠️ Volume ${volumeName} may not exist, skipping.`);
      }

      this.logger.log('🗑️ Deleting project directory...');
      fs.rmSync(projectPath, { recursive: true, force: true });

      this.logger.log('🗑️ Deleting volume directory...');
      try {
        execSync(`sudo rm -rf ${volumePath}`, { stdio: 'inherit' });
      } catch (error) {
        this.logger.warn(
          `⚠️ Volume directory ${volumePath} may not exist, skipping.`,
        );
      }

      this.logger.log('📦 Removing associated Docker images...');
      execSync(`docker image prune -a -f`, { stdio: 'inherit' });

      this.logger.log('⚙️ Cleaning up cgroup directory...');
      if (fs.existsSync(cgroupPath)) {
        try {
          execSync(`sudo rmdir ${cgroupPath}`);
        } catch (err) {
          this.logger.warn(
            '⚠️ Unable to remove cgroup directory. May require elevated permissions.',
          );
        }
      }

      this.logger.log('🧼 Removing nginx config and link...');
      try {
        execSync(`sudo rm ${nginxConfig}`);
        execSync(`sudo rm ${nginxEnabledLink}`);
        this.logger.log('✅ Nginx config and link removed.');
      } catch (error) {
        this.logger.error(`❌ Failed to remove nginx files: ${error.message}`);
      }

      this.logger.log('🔄 Reloading NGINX...');
      execSync('sudo systemctl reload nginx');

      return { message: 'Project cleanup successful.' };
    } catch (err) {
      this.logger.error(`❌ Cleanup error: ${err.message}`);
      throw new InternalServerErrorException(`Cleanup failed: ${err.message}`);
    }
  }
}
