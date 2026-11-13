import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import type { AccessClaims } from '../auth/access-token.service';
import { CurrentAuth } from '../auth/decorators/auth.decorators';
import {
  NotificationListDto,
  NotificationParamsDto,
  NotificationPreferencesDto,
  NotificationQueryDto,
  UnreadCountDto,
  UpdateNotificationPreferencesDto,
} from './dto/notifications.dto';
import { NotificationsService } from './notifications.service';

/** A student's own notifications and their choices about them. Nobody else's are reachable. */
@ApiTags('notifications')
@Controller('me')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('notifications')
  @ApiOperation({ summary: 'My notifications, newest first, 20 per page, with the unread count' })
  @ZodResponse({ type: NotificationListDto })
  list(@CurrentAuth() auth: AccessClaims, @Query() query: NotificationQueryDto) {
    return this.notifications.list(auth.userId, query);
  }

  @Get('notifications/unread-count')
  @ApiOperation({ summary: 'How many of my notifications are unread' })
  @ZodResponse({ type: UnreadCountDto })
  unreadCount(@CurrentAuth() auth: AccessClaims) {
    return this.notifications.unreadCount(auth.userId);
  }

  @Post('notifications/read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all my notifications as read' })
  @ZodResponse({ type: UnreadCountDto, status: HttpStatus.OK })
  readAll(@CurrentAuth() auth: AccessClaims) {
    return this.notifications.markAllRead(auth.userId);
  }

  @Put('notifications/:id/read')
  @ApiOperation({ summary: 'Mark one of my notifications as read (404 for anyone else’s)' })
  @ZodResponse({ type: UnreadCountDto })
  read(@CurrentAuth() auth: AccessClaims, @Param() params: NotificationParamsDto) {
    return this.notifications.markRead(auth.userId, params.id);
  }

  @Get('notification-preferences')
  @ApiOperation({ summary: 'Where I receive each category: in the app, by email' })
  @ZodResponse({ type: NotificationPreferencesDto })
  preferences(@CurrentAuth() auth: AccessClaims) {
    return this.notifications.getPreferences(auth.userId);
  }

  @Put('notification-preferences')
  @ApiOperation({ summary: 'Change where I receive some categories' })
  @ZodResponse({ type: NotificationPreferencesDto })
  updatePreferences(
    @CurrentAuth() auth: AccessClaims,
    @Body() body: UpdateNotificationPreferencesDto,
  ) {
    return this.notifications.updatePreferences(auth.userId, body);
  }
}
