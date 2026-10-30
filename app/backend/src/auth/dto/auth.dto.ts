import {
  AcceptedSchema,
  CurrentUserSchema,
  EmailOnlySchema,
  ResetPasswordSchema,
  SignInSchema,
  SignUpSchema,
  VerifyEmailSchema,
} from '@tekcert/types';
import { createZodDto } from 'nestjs-zod';

export class SignUpDto extends createZodDto(SignUpSchema) {}
export class SignInDto extends createZodDto(SignInSchema) {}
export class EmailOnlyDto extends createZodDto(EmailOnlySchema) {}
export class VerifyEmailDto extends createZodDto(VerifyEmailSchema) {}
export class ResetPasswordDto extends createZodDto(ResetPasswordSchema) {}
export class CurrentUserDto extends createZodDto(CurrentUserSchema) {}
export class AcceptedDto extends createZodDto(AcceptedSchema) {}
