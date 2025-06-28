import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';

@Injectable()
export class LimitationService {
  limitStorageWrite(projectCgroup: string, limit = 2): void {
    exec(
      `echo "259:0 wbps=${limit}" | sudo tee /sys/fs/cgroup/${projectCgroup}/io.max`,
      (err, stdout, stderr) => {
        if (err) {
          console.error('Failed to apply I/O limit:', stderr);
        } else {
          console.log('I/O limit applied:', stdout);
        }
      },
    );
  }

  removeThrottle(projectCgroup: string): void {
    exec(
      `echo "default" | sudo tee /sys/fs/cgroup/${projectCgroup}/io.max`,
      (err, stdout, stderr) => {
        if (err) {
          console.error('Failed to reset I/O limit:', stderr);
        } else {
          console.log('I/O limit removed:', stdout);
        }
      },
    );
  }
}
