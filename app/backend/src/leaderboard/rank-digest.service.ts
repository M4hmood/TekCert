import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LEADERBOARD_CHANGE_DAYS } from '@tekcert/types';
import { CLOCK, type Clock } from '../common/utils/clock';
import { NotificationsService, type PendingEmail } from '../notifications/notifications.service';
import { PointsService } from '../progress/points.service';
import { TIME_ZONE, tunisDay } from '../progress/utils/labels';
import { type RankableStudent, UsersService } from '../users/users.service';
import { rankChanges } from './utils/board';

const DAY_MS = 86_400_000;

/**
 * Once a week, tells each student how far they moved on their specialty's all-time board: the
 * same "change" the leaderboard shows (ADR-022), so the notification and the screen agree.
 *
 * Safe on several servers: a notification is unique per student and per day of the run, so a
 * second run that day writes nothing and sends nothing.
 */
@Injectable()
export class RankDigestService {
  private readonly logger = new Logger('RankDigest');

  constructor(
    private readonly users: UsersService,
    private readonly points: PointsService,
    private readonly notifications: NotificationsService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Mondays at 08:00 in Tunis. */
  @Cron('0 8 * * 1', { name: 'rank-digest', timeZone: TIME_ZONE })
  async scheduled(): Promise<void> {
    try {
      const moves = await this.run();
      this.logger.log(`Weekly rank notifications: ${moves} students moved`);
    } catch (error) {
      this.logger.error(`Weekly rank notifications failed: ${String(error)}`);
    }
  }

  /** Writes the notifications for this week; returns how many students moved. */
  async run(): Promise<number> {
    const now = this.clock.now();
    const weekAgo = new Date(now.getTime() - LEADERBOARD_CHANGE_DAYS * DAY_MS);
    const [students, current, previous] = await Promise.all([
      this.users.findRankable({}),
      this.points.totalsBetween(null, null),
      this.points.totalsBetween(null, weekAgo),
    ]);

    const day = tunisDay(now);
    const pending: PendingEmail[] = [];
    let moves = 0;
    for (const [board, members] of byBoard(students)) {
      const ids = members.map((member) => member.id);
      for (const moved of rankChanges(ids, current, previous)) {
        const emails = await this.notifications.record({
          userId: moved.id,
          kind: 'rank_changed',
          day,
          rank: moved.rank,
          total: ids.length,
          change: moved.change,
          board,
        });
        pending.push(...emails);
        moves += 1;
      }
    }
    this.notifications.deliver(pending);
    return moves;
  }
}

/**
 * The "My specialty" boards: ING-4/5 by class specialty, ING-1 to 3 by the one they aim for,
 * and the undecided together (keyed null).
 */
function byBoard(students: RankableStudent[]): Map<string | null, RankableStudent[]> {
  const boards = new Map<string | null, RankableStudent[]>();
  for (const student of students) {
    const key = student.specialty?.code ?? student.targetSpecialty?.code ?? null;
    const members = boards.get(key) ?? [];
    members.push(student);
    boards.set(key, members);
  }
  return boards;
}
