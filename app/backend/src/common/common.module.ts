import { Global, Module } from '@nestjs/common';
import { CLOCK, systemClock } from './utils/clock';

/** App-wide helpers every module may inject. Tests override CLOCK to move time forward. */
@Global()
@Module({
  providers: [{ provide: CLOCK, useValue: systemClock }],
  exports: [CLOCK],
})
export class CommonModule {}
