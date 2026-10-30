import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificationsController } from './certifications.controller';
import { CertificationsService } from './certifications.service';
import { Certification } from './entities/certification.entity';
import { UserCertification } from './entities/user-certification.entity';
import { UserCertificationsService } from './user-certifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([Certification, UserCertification])],
  controllers: [CertificationsController],
  providers: [CertificationsService, UserCertificationsService],
  exports: [CertificationsService, UserCertificationsService],
})
export class CertificationsModule {}
