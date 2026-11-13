import { SettingsSchema, UpdateAccountSchema, UpdatePreferencesSchema } from '@tekcert/types';
import { createZodDto } from 'nestjs-zod';

export class SettingsDto extends createZodDto(SettingsSchema) {}
export class UpdateAccountDto extends createZodDto(UpdateAccountSchema) {}
export class UpdatePreferencesDto extends createZodDto(UpdatePreferencesSchema) {}
