import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AVATAR_MAX_BYTES } from '@tekcert/types';
import type { Response } from 'express';
import { ZodResponse } from 'nestjs-zod';
import type { AccessClaims } from '../auth/access-token.service';
import { CurrentAuth } from '../auth/decorators/auth.decorators';
import { AvatarDto, UserParamsDto } from './dto/avatars.dto';
import { AvatarsService } from './avatars.service';

@ApiTags('avatars')
@Controller()
export class AvatarsController {
  constructor(private readonly avatars: AvatarsService) {}

  @Put('me/avatar')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Upload the profile photo (field "photo": JPG or PNG, 5 MB max; stored as 512×512 WebP)',
  })
  // Multer stops reading past the limit and answers 413; the bytes stay in memory, never on disk.
  @UseInterceptors(
    FileInterceptor('photo', { limits: { fileSize: AVATAR_MAX_BYTES, files: 1, fields: 0 } }),
  )
  @ZodResponse({ status: HttpStatus.OK, type: AvatarDto })
  async upload(
    @CurrentAuth() auth: AccessClaims,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) throw new BadRequestException('Attach the photo in the "photo" field.');
    return this.avatars.replace(auth.userId, file.buffer);
  }

  @Delete('me/avatar')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove the profile photo' })
  async remove(@CurrentAuth() auth: AccessClaims): Promise<void> {
    await this.avatars.remove(auth.userId);
  }

  @Get('users/:id/avatar')
  @ApiOperation({ summary: "A student's profile photo (signed-in students only)" })
  async read(
    @Param() params: UserParamsDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const object = await this.avatars.read(params.id);
    // Versioned URLs (?v=hash) change with the photo, so browsers may keep it for a while.
    res.setHeader('Cache-Control', 'private, max-age=86400');
    return new StreamableFile(object.body, { type: object.contentType ?? 'image/webp' });
  }
}
