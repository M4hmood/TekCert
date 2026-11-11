import {
  DirectoryQuerySchema,
  DirectorySchema,
  MyProfileSettingsSchema,
  StudentParamsSchema,
  StudentProfileSchema,
  UpdateMyProfileSchema,
} from '@tekcert/types';
import { createZodDto } from 'nestjs-zod';

export class DirectoryQueryDto extends createZodDto(DirectoryQuerySchema) {}
export class DirectoryDto extends createZodDto(DirectorySchema) {}
export class StudentParamsDto extends createZodDto(StudentParamsSchema) {}
export class StudentProfileDto extends createZodDto(StudentProfileSchema) {}
export class UpdateMyProfileDto extends createZodDto(UpdateMyProfileSchema) {}
export class MyProfileSettingsDto extends createZodDto(MyProfileSettingsSchema) {}
