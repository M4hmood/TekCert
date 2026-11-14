import { PublicStatsSchema } from '@tekcert/types';
import { createZodDto } from 'nestjs-zod';

export class PublicStatsDto extends createZodDto(PublicStatsSchema) {}
