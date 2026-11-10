import { EmailToken } from '../auth/entities/email-token.entity';
import { LoginAttempt } from '../auth/entities/login-attempt.entity';
import { Session } from '../auth/entities/session.entity';
import { CertificationDomain } from '../certifications/entities/certification-domain.entity';
import { CertificationResource } from '../certifications/entities/certification-resource.entity';
import { Certification } from '../certifications/entities/certification.entity';
import { Chapter } from '../certifications/entities/chapter.entity';
import { ChapterProgress } from '../certifications/entities/chapter-progress.entity';
import { Preparation } from '../certifications/entities/preparation.entity';
import { Provider } from '../certifications/entities/provider.entity';
import { UserCertification } from '../certifications/entities/user-certification.entity';
import { PathNode } from '../paths/entities/path-node.entity';
import { Path } from '../paths/entities/path.entity';
import { ActivityEvent } from '../progress/entities/activity-event.entity';
import { PointEvent } from '../progress/entities/point-event.entity';
import { UserBadge } from '../progress/entities/user-badge.entity';
import { SchoolClass } from '../school/entities/school-class.entity';
import { Specialty } from '../school/entities/specialty.entity';
import { User } from '../users/entities/user.entity';

/**
 * Every entity, registered explicitly (no globs) so the app and the CLI see the same set.
 * Each entity lives in the module that owns it (ADR-017); only the database layer (the data
 * source and the seed) imports them from here.
 */
export {
  ActivityEvent,
  Certification,
  CertificationDomain,
  CertificationResource,
  Chapter,
  ChapterProgress,
  EmailToken,
  LoginAttempt,
  Path,
  PathNode,
  PointEvent,
  Preparation,
  Provider,
  SchoolClass,
  Session,
  Specialty,
  User,
  UserBadge,
  UserCertification,
};

export const ENTITIES = [
  Specialty,
  SchoolClass,
  User,
  Provider,
  Certification,
  CertificationDomain,
  Chapter,
  CertificationResource,
  Path,
  PathNode,
  Session,
  EmailToken,
  LoginAttempt,
  UserCertification,
  Preparation,
  ChapterProgress,
  PointEvent,
  UserBadge,
  ActivityEvent,
];
