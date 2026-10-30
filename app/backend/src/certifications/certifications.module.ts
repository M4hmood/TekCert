import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PathsModule } from '../paths/paths.module';
import { UsersModule } from '../users/users.module';
import { CertificationsController } from './certifications.controller';
import { CertificationsService } from './certifications.service';
import { Certification } from './entities/certification.entity';
import { Preparation } from './entities/preparation.entity';
import { UserCertification } from './entities/user-certification.entity';
import { MyCertificationsController } from './my-certifications.controller';
import { PreparationsService } from './preparations.service';
import { UserCertificationsService } from './user-certifications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Certification, UserCertification, Preparation]),
    UsersModule,
    PathsModule,
  ],
  controllers: [CertificationsController, MyCertificationsController],
  providers: [CertificationsService, UserCertificationsService, PreparationsService],
  exports: [CertificationsService, UserCertificationsService],
})
export class CertificationsModule {}
