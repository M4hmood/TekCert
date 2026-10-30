/** Injectable time source, so expiry and lockout rules can be tested without waiting. */
export const CLOCK = Symbol('CLOCK');

export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };
