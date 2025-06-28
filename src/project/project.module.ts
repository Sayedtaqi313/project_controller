import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { DockerService } from './docker.service';
import { LimitationService } from './limitation.service';
import { StorageService } from './storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([Project])],
  controllers: [ProjectController],
  providers: [ProjectService, DockerService, LimitationService, StorageService],
})
export class ProjectModule {}
