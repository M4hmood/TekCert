import { CertificationDomain } from './certification-domain.entity';
import { Certification } from './certification.entity';
import { Chapter } from './chapter.entity';
import { PathNode } from './path-node.entity';
import { Path } from './path.entity';
import { Provider } from './provider.entity';
import { SchoolClass } from './school-class.entity';
import { Specialty } from './specialty.entity';
import { User } from './user.entity';

export {
  Certification,
  CertificationDomain,
  Chapter,
  Path,
  PathNode,
  Provider,
  SchoolClass,
  Specialty,
  User,
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
];
