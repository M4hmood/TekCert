import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Certification } from '../database/entities';
import { CertificationsController } from './certifications.controller';
import { CertificationsService } from './certifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([Certification])],
  controllers: [CertificationsController],
  providers: [CertificationsService],
})
export class CertificationsModule {}
