import { CertificationDomain } from './certification-domain.entity';
import { Certification } from './certification.entity';
import { Chapter } from './chapter.entity';
import { EmailToken } from './email-token.entity';
import { LoginAttempt } from './login-attempt.entity';
import { PathNode } from './path-node.entity';
import { Path } from './path.entity';
import { Provider } from './provider.entity';
import { SchoolClass } from './school-class.entity';
import { Session } from './session.entity';
import { Specialty } from './specialty.entity';
import { UserCertification } from './user-certification.entity';
import { User } from './user.entity';

export {
  Certification,
  CertificationDomain,
  Chapter,
  EmailToken,
  LoginAttempt,
  Path,
  PathNode,
  Provider,
  SchoolClass,
  Session,
  Specialty,
  User,
  UserCertification,
};

/** Every entity, registered explicitly (no globs) so the app and the CLI see the same set. */
export const ENTITIES = [
  Specialty,
  SchoolClass,
  User,
  Provider,
  Certification,
  CertificationDomain,
  Chapter,
  Path,
  PathNode,
  Session,
  EmailToken,
  LoginAttempt,
  UserCertification,
];
