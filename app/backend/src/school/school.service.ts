import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
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

  listSpecialties(): Promise<Specialty[]> {
    return this.specialties.find();
  }
}
