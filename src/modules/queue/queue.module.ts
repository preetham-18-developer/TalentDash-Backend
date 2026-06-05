import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueProcessor } from './queue.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'background-tasks',
    }),
  ],
  providers: [QueueProcessor],
  exports: [BullModule],
})
export class QueueModule {}
