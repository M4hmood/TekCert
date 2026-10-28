import {
  CertificationDetailSchema,
  CertificationListQuerySchema,
  CertificationListSchema,
  SlugSchema,
} from '@tekcert/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class CertificationListQueryDto extends createZodDto(CertificationListQuerySchema) {}
export class CertificationListDto extends createZodDto(CertificationListSchema) {}
export class CertificationDetailDto extends createZodDto(CertificationDetailSchema) {}
export class CertificationParamsDto extends createZodDto(z.object({ slug: SlugSchema })) {}
