import { Module } from '@nestjs/common';
import { AlimentosModule } from './alimentos/alimentos.module.js';
import { DatabaseModule } from './database/database.module.js';

@Module({
  imports: [DatabaseModule, AlimentosModule],
})
export class AppModule {}
