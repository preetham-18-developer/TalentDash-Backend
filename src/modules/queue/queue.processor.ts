import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

@Processor('background-tasks')
export class QueueProcessor extends WorkerHost {
  private readonly logger = new Logger(QueueProcessor.name);

  async process(job: Job<any, any, string>): Promise<any> {
    await Promise.resolve();
    this.logger.log(
      `Processing background job ${job.id} [${job.name}] with data: ${JSON.stringify(job.data)}`,
    );

    const data = job.data as Record<string, unknown>;

    switch (job.name) {
      case 'test-job': {
        const message = typeof data?.message === 'string' ? data.message : '';
        this.logger.log(`Simulated task completed: ${message}`);
        return { success: true, processedAt: new Date().toISOString() };
      }
      case 'process-skills': {
        const skills = Array.isArray(data?.skills)
          ? (data.skills as string[])
          : [];
        this.logger.log(`Analyzing skills list: ${skills.join(', ')}`);
        return { success: true, skillsCount: skills.length };
      }
      default:
        this.logger.warn(`Unknown job name encountered: ${job.name}`);
        return { success: false, error: 'unknown_job_name' };
    }
  }
}
