import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import {
  type AcademicYearAnswer,
  AcademicYearAnswerSchema,
  type EnrolmentInput,
  EnrolmentSchema,
} from '@tekcert/types';
import { ZodResponse, ZodValidationPipe } from 'nestjs-zod';
import { z } from 'zod';
import type { AccessClaims } from '../auth/access-token.service';
import { CurrentAuth } from '../auth/decorators/auth.decorators';
import { SettingsDto, UpdateAccountDto, UpdatePreferencesDto } from './dto/settings.dto';
import { SettingsService } from './settings.service';

type BodySchema = NonNullable<
  Extract<Parameters<typeof ApiBody>[0], { schema?: unknown }>['schema']
>;
const openApi = (schema: z.ZodType) =>
  z.toJSONSchema(schema, { target: 'openapi-3.0' }) as BodySchema;

/** Every change answers with the whole settings, so the screen just replaces its copy. */
@ApiTags('settings')
@Controller('me')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('settings')
  @ApiOperation({ summary: 'My account, class, privacy choices, theme and the academic year' })
  @ZodResponse({ type: SettingsDto })
  get(@CurrentAuth() auth: AccessClaims) {
    return this.settings.get(auth.userId);
  }

  @Patch('account')
  @ApiOperation({ summary: 'Change my first and last name' })
  @ZodResponse({ type: SettingsDto })
  updateAccount(@CurrentAuth() auth: AccessClaims, @Body() body: UpdateAccountDto) {
    return this.settings.updateAccount(auth.userId, body);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Save my theme on my account, so it follows me across devices' })
  @ZodResponse({ type: SettingsDto })
  setPreferences(@CurrentAuth() auth: AccessClaims, @Body() body: UpdatePreferencesDto) {
    return this.settings.setPreferences(auth.userId, body);
  }

  @Put('enrolment')
  @ApiOperation({ summary: 'Change my year, group and specialty (confirms the academic year)' })
  @ZodResponse({ type: SettingsDto })
  @ApiBody({ schema: openApi(EnrolmentSchema) })
  saveEnrolment(
    @CurrentAuth() auth: AccessClaims,
    @Body(new ZodValidationPipe(EnrolmentSchema)) body: EnrolmentInput,
  ) {
    return this.settings.saveEnrolment(auth.userId, body);
  }

  @Post('academic-year')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Where I am this year: moving up, repeating, or no longer at TEK-UP' })
  @ZodResponse({ type: SettingsDto, status: HttpStatus.OK })
  @ApiBody({ schema: openApi(AcademicYearAnswerSchema) })
  answerAcademicYear(
    @CurrentAuth() auth: AccessClaims,
    @Body(new ZodValidationPipe(AcademicYearAnswerSchema)) body: AcademicYearAnswer,
  ) {
    return this.settings.answerAcademicYear(auth.userId, body);
  }

  @Get('export.csv')
  @Header('content-type', 'text/csv; charset=utf-8')
  @Header('content-disposition', 'attachment; filename="tekcert-export.csv"')
  // The file holds personal data: neither the browser nor a proxy keeps a copy.
  @Header('cache-control', 'no-store')
  @ApiOperation({ summary: 'My certifications, finished chapters and points ledger as CSV' })
  @ApiProduces('text/csv')
  exportCsv(@CurrentAuth() auth: AccessClaims) {
    return this.settings.exportCsv(auth.userId);
  }
}
