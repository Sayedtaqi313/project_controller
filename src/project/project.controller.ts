import { Controller, Post, Get, Delete, Param, Res } from '@nestjs/common';
import { ProjectService } from './project.service';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

@Controller('projects')
@ApiTags('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post('start/:projectId')
  @ApiOperation({
    summary: 'Start a project',
    description: 'Starts a project using Docker Compose',
  })
  @ApiParam({
    name: 'projectId',
    type: 'string',
    description: 'The ID of the project to start',
  })
  @ApiResponse({ status: 200, description: 'Project started successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async startProject(@Param('projectId') projectId: string) {
    return this.projectService.startProject(projectId);
  }

  @Post('stop/:projectId')
  @ApiOperation({
    summary: 'Stop a project',
    description: 'Stops a project using Docker Compose',
  })
  @ApiParam({
    name: 'projectId',
    type: 'string',
    description: 'The ID of the project to stop',
  })
  @ApiResponse({ status: 200, description: 'Project stopped successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async stopProject(@Param('projectId') projectId: string) {
    return this.projectService.stopProject(projectId);
  }

  @Get('get_storage/:projectId')
  @ApiOperation({
    summary: 'Get project storage info',
    description: 'Retrieves storage information for a specific project',
  })
  @ApiParam({
    name: 'projectId',
    type: 'string',
    description: 'The ID of the project to check storage for',
  })
  @ApiResponse({
    status: 200,
    description: 'Storage information retrieved successfully',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getProjectStorage(@Param('projectId') projectId: string) {
    return this.projectService.getProjectStorage(projectId);
  }

  @Get('get_instanceInfo')
  @ApiOperation({
    summary: 'Get EC2 instance disk info',
    description: 'Retrieves disk information for the EC2 instance',
  })
  @ApiResponse({
    status: 200,
    description: 'Disk information retrieved successfully',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getEc2InstanceInfo() {
    return this.projectService.getEc2InstanceInfo();
  }

  @Get('system-stats')
  @ApiOperation({
    summary: 'Get system statistics',
    description: 'Retrieves comprehensive system statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'System statistics retrieved successfully',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getSystemStats() {
    return this.projectService.getSystemStats();
  }

  @Get()
  @ApiOperation({
    summary: 'Get all projects',
    description: 'Retrieves a list of all projects with their storage info',
  })
  @ApiResponse({ status: 200, description: 'Projects retrieved successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getProjects() {
    return this.projectService.getProjects();
  }

  @Delete(':projectName')
  @ApiOperation({
    summary: 'Delete project resources',
    description:
      'Cleans up and deletes all resources associated with a project',
  })
  @ApiParam({
    name: 'projectName',
    type: 'string',
    description: 'The name of the project to delete',
  })
  @ApiResponse({
    status: 200,
    description: 'Project resources deleted successfully',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async deleteProjectResources(
    @Param('projectName') projectName: string,
    @Res() res: Response,
  ) {
    const result =
      await this.projectService.deleteProjectResources(projectName);
    return res.status(200).json(result);
  }
}
