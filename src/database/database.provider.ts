import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DATABASE_CONNECTION } from './database.constants';
import * as schema from './schema/index';

export const databaseProvider: Provider = {
  provide: DATABASE_CONNECTION,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const databaseUrl = configService.getOrThrow<string>('DATABASE_URL');

    const pool = new Pool({
      connectionString: databaseUrl,
      max: 10,
    });

    pool.on('error', (error: Error) => {
      console.error('Unexpected PostgreSQL error', error);
    });

    return drizzle(pool, {
      schema,
    });
  },
};
