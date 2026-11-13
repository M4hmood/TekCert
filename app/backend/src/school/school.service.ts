import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { classCodeFor, type EnrolmentInput, ONBOARDING_PROBLEM } from '@tekcert/types';
import type { Repository } from 'typeorm';
import { ProblemException } from '../common/exceptions/problem.exception';
import { SchoolClass } from './entities/school-class.entity';
import { Specialty } from './entities/specialty.entity';

/** Owns the institute's reference data: specialties and the seeded classes. */
@Injectable()
export class SchoolService {
  constructor(
    @InjectRepository(SchoolClass) private readonly classes: Repository<SchoolClass>,
    @InjectRepository(Specialty) private readonly specialties: Repository<Specialty>,
  ) {}

  findClassByCode(code: string): Promise<SchoolClass | null> {
    return this.classes.findOneBy({ code });
  }

  /** Throws when the code isn't seeded; callers pass codes already validated by the schema. */
  getSpecialtyByCode(code: string): Promise<Specialty> {
    return this.specialties.findOneByOrFail({ code });
  }

  /**
   * The seeded class an enrolment names and, in ING-1 to 3, the specialty aimed for. 422 when
   * the institute has no such class.
   */
  async resolveEnrolment(
    input: EnrolmentInput,
  ): Promise<{ classId: string; targetSpecialtyId: string | null }> {
    const code = classCodeFor(input);
    const schoolClass = await this.findClassByCode(code);
    if (!schoolClass) {
      throw new ProblemException({
        type: ONBOARDING_PROBLEM.unknownClass,
        title: 'Unknown class',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        detail: `There is no class ${code}.`,
      });
    }
    const target =
      'targetSpecialty' in input && input.targetSpecialty
        ? await this.getSpecialtyByCode(input.targetSpecialty)
        : null;
    return { classId: schoolClass.id, targetSpecialtyId: target?.id ?? null };
  }

  listSpecialties(): Promise<Specialty[]> {
    return this.specialties.find();
  }
}
