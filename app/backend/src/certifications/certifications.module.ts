import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PathsModule } from '../paths/paths.module';
import { UsersModule } from '../users/users.module';
import { CertificationsController } from './certifications.controller';
import { CertificationsService } from './certifications.service';
import { ChapterProgressService } from './chapter-progress.service';
import { Certification } from './entities/certification.entity';
import { ChapterProgress } from './entities/chapter-progress.entity';
import { Chapter } from './entities/chapter.entity';
import { Preparation } from './entities/preparation.entity';
import { UserCertification } from './entities/user-certification.entity';
import { MyCertificationsController } from './my-certifications.controller';
import { PreparationsService } from './preparations.service';
import { UserCertificationsService } from './user-certifications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Certification,
      Chapter,
      UserCertification,
      Preparation,
      ChapterProgress,
    ]),
    UsersModule,
    PathsModule,
  ],
  controllers: [CertificationsController, MyCertificationsController],
  providers: [
    CertificationsService,
    UserCertificationsService,
    PreparationsService,
    ChapterProgressService,
  ],
  exports: [CertificationsService, UserCertificationsService],
})
export class CertificationsModule {}
