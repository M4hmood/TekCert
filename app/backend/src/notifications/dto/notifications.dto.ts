import {
  NotificationListSchema,
  NotificationParamsSchema,
  NotificationPreferencesSchema,
  NotificationQuerySchema,
  UnreadCountSchema,
  UpdateNotificationPreferencesSchema,
} from '@tekcert/types';
import { createZodDto } from 'nestjs-zod';

export class NotificationQueryDto extends createZodDto(NotificationQuerySchema) {}
export class NotificationListDto extends createZodDto(NotificationListSchema) {}
export class NotificationParamsDto extends createZodDto(NotificationParamsSchema) {}
export class UnreadCountDto extends createZodDto(UnreadCountSchema) {}
export class NotificationPreferencesDto extends createZodDto(NotificationPreferencesSchema) {}
export class UpdateNotificationPreferencesDto extends createZodDto(
  UpdateNotificationPreferencesSchema,
) {}
