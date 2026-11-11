import {
  ActivityFeedSchema,
  ActivityQuerySchema,
  ChapterParamsSchema,
  ChapterTickResultSchema,
  DashboardSchema,
  MyPointsSchema,
} from '@tekcert/types';
import { createZodDto } from 'nestjs-zod';

export class ChapterParamsDto extends createZodDto(ChapterParamsSchema) {}
export class ChapterTickResultDto extends createZodDto(ChapterTickResultSchema) {}
export class MyPointsDto extends createZodDto(MyPointsSchema) {}
export class DashboardDto extends createZodDto(DashboardSchema) {}
export class ActivityQueryDto extends createZodDto(ActivityQuerySchema) {}
export class ActivityFeedDto extends createZodDto(ActivityFeedSchema) {}
