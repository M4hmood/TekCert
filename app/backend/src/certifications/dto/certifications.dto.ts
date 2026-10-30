import {
  CertificationCommunitySchema,
  CertificationDetailSchema,
  CertificationListQuerySchema,
  CertificationListSchema,
  CommunityQuerySchema,
  MyCertificationSchema,
  MyCertificationsSchema,
  SlugSchema,
} from '@tekcert/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class CertificationListQueryDto extends createZodDto(CertificationListQuerySchema) {}
export class CertificationListDto extends createZodDto(CertificationListSchema) {}
export class CertificationDetailDto extends createZodDto(CertificationDetailSchema) {}
export class CertificationParamsDto extends createZodDto(z.object({ slug: SlugSchema })) {}
export class CommunityQueryDto extends createZodDto(CommunityQuerySchema) {}
export class CertificationCommunityDto extends createZodDto(CertificationCommunitySchema) {}
export class MyCertificationDto extends createZodDto(MyCertificationSchema) {}
export class MyCertificationsDto extends createZodDto(MyCertificationsSchema) {}
