import { next } from '@tekcert/config/eslint/next';

const config = [...next, { ignores: ['scripts/**'] }];

export default config;
