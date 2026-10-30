import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolClass } from './entities/school-class.entity';
import { Specialty } from './entities/specialty.entity';
import { SchoolService } from './school.service';

@Module({
  imports: [TypeOrmModule.forFeature([SchoolClass, Specialty])],
  providers: [SchoolService],
  exports: [SchoolService],
})
export class SchoolModule {}
