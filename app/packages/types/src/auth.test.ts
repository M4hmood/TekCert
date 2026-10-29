import { describe, expect, it } from 'vitest';
import {
  InstituteEmailSchema,
  NewPasswordSchema,
  PASSWORD_RULES,
  SignInSchema,
  SignUpSchema,
  TokenSchema,
  VISIBILITY_REQUIRED_MESSAGE,
} from './auth.js';

describe('InstituteEmailSchema', () => {
  it('accepts and normalises institute addresses', () => {
    expect(InstituteEmailSchema.parse('  Yassine.BenAmor@TEK-UP.de ')).toBe(
      'yassine.benamor@tek-up.de',
    );
  });

  it.each(['someone@gmail.com', 'x@tek-up.de.evil.com', 'x@sub.tek-up.com', 'not-an-email'])(
    'rejects %s',
    (email) => {
      expect(InstituteEmailSchema.safeParse(email).success).toBe(false);
    },
  );

  it('explains the domain rule', () => {
    const result = InstituteEmailSchema.safeParse('someone@gmail.com');
    expect(result.error?.issues[0]?.message).toBe('Use your @tek-up.de address');
  });
});

describe('password rules', () => {
  const passing = (value: string) =>
    PASSWORD_RULES.filter((rule) => rule.test(value)).map((rule) => rule.id);

  it('reports each rule separately for the live checklist', () => {
    expect(passing('abcdefgh')).toEqual(['length']);
    expect(passing('abc1')).toEqual(['number']);
    expect(passing('abcdefg1!')).toEqual(['length', 'number', 'symbol']);
  });

  it('accepts a password that meets every rule', () => {
    expect(NewPasswordSchema.safeParse('correct-horse-9').success).toBe(true);
  });

  it.each(['short1!', 'no-numbers-here', 'n0symbolshere', 'x'.repeat(126) + '1!a'])(
    'rejects %s',
    (password) => {
      expect(NewPasswordSchema.safeParse(password).success).toBe(false);
    },
  );
});

describe('SignUpSchema', () => {
  const valid = {
    firstName: ' Yassine ',
    lastName: 'Ben Amor',
    email: 'yassine.benamor@tek-up.de',
    password: 'correct-horse-9',
    acceptVisibility: true,
  };

  it('accepts a sign-up that accepts profile visibility', () => {
    expect(SignUpSchema.parse(valid)).toMatchObject({ firstName: 'Yassine' });
  });

  it.each([false, undefined])('refuses a sign-up without visibility (%s)', (acceptVisibility) => {
    const result = SignUpSchema.safeParse({ ...valid, acceptVisibility });
    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        path: ['acceptVisibility'],
        message: VISIBILITY_REQUIRED_MESSAGE,
      }),
    ]);
  });
});

describe('SignInSchema', () => {
  it('accepts any address so unknown domains get the same answer as wrong passwords', () => {
    expect(SignInSchema.parse({ email: 'A@B.com', password: 'x' })).toEqual({
      email: 'a@b.com',
      password: 'x',
      remember: false,
    });
  });
});

describe('TokenSchema', () => {
  it('accepts a 32-byte base64url token only', () => {
    expect(TokenSchema.safeParse('a'.repeat(43)).success).toBe(true);
    expect(TokenSchema.safeParse('a'.repeat(42)).success).toBe(false);
    expect(TokenSchema.safeParse(`${'a'.repeat(42)}=`).success).toBe(false);
  });
});
