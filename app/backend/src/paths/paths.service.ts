import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Path } from './entities/path.entity';

/** The shared path for ING-1…3 students who haven't chosen a specialty yet. */
const FUNDAMENTALS_PATH = 'FOND';

@Injectable()
export class PathsService {
  constructor(@InjectRepository(Path) private readonly paths: Repository<Path>) {}

  /**
   * The specialty's path, or Fundamentals when `specialtyId` is null. Loads the specialty and
   * every node with its certification and prerequisite.
   */
  findForSpecialty(specialtyId: string | null): Promise<Path | null> {
    return this.paths.findOne({
      where: specialtyId ? { specialtyId } : { code: FUNDAMENTALS_PATH },
      relations: { specialty: true, nodes: { certification: true, prerequisite: true } },
    });
  }

  /** Every path with its nodes and their certifications. */
  listWithNodes(): Promise<Path[]> {
    return this.paths.find({ relations: { nodes: { certification: true } } });
  }
}
