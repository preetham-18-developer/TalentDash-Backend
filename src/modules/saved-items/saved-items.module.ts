import { Module } from '@nestjs/common';
import { SavedItemsService } from './saved-items.service';
import { SavedItemsController } from './saved-items.controller';

@Module({
  controllers: [SavedItemsController],
  providers: [SavedItemsService],
  exports: [SavedItemsService],
})
export class SavedItemsModule {}
