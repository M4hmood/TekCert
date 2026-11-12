import {
  LeaderboardQuerySchema,
  SpecialtyBoardQuerySchema,
  SpecialtyLeaderboardSchema,
  StudentLeaderboardSchema,
} from '@tekcert/types';
import { createZodDto } from 'nestjs-zod';

export class LeaderboardQueryDto extends createZodDto(LeaderboardQuerySchema) {}
export class StudentLeaderboardDto extends createZodDto(StudentLeaderboardSchema) {}
export class SpecialtyBoardQueryDto extends createZodDto(SpecialtyBoardQuerySchema) {}
export class SpecialtyLeaderboardDto extends createZodDto(SpecialtyLeaderboardSchema) {}
