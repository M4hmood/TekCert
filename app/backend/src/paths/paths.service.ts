import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { Certification } from '../certifications/entities/certification.entity';
import { PathNode } from './entities/path-node.entity';
import { Path } from './entities/path.entity';

/** The shared path for ING-1…3 students who haven't chosen a specialty yet. */
const FUNDAMENTALS_PATH = 'FOND';

@Injectable()
export class PathsService {
  constructor(
    @InjectRepository(Path) private readonly paths: Repository<Path>,
    @InjectRepository(PathNode) private readonly nodes: Repository<PathNode>,
  ) {}

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

  /**
   * The certifications recommended before this one: its prerequisite on every path that has
   * it, without duplicates, in code order.
   */
  async prerequisitesOf(certificationId: string): Promise<Certification[]> {
    const nodes = await this.nodes.find({
      where: { certificationId },
      relations: { prerequisite: true },
    });
    const unique = new Map<string, Certification>();
    for (const node of nodes) {
      if (node.prerequisite?.isActive) unique.set(node.prerequisite.id, node.prerequisite);
    }
    return [...unique.values()].sort((a, b) => a.code.localeCompare(b.code));
  }
}
