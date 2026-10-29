import { AvatarSchema } from '@tekcert/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class AvatarDto extends createZodDto(AvatarSchema) {}
export class UserParamsDto extends createZodDto(z.object({ id: z.uuid() })) {}
