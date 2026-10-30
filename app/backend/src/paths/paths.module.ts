import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PathNode } from './entities/path-node.entity';
import { Path } from './entities/path.entity';
import { PathsService } from './paths.service';

@Module({
  imports: [TypeOrmModule.forFeature([Path, PathNode])],
  providers: [PathsService],
  exports: [PathsService],
})
export class PathsModule {}
