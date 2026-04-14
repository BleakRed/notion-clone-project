import { PrismaClient } from '@prisma/client';

const prismaClient = new PrismaClient();

/**
 * Custom Prisma client that supports Row Level Security (RLS)
 * by setting the current user ID in the PostgreSQL session.
 */
export const getRlsClient = (userId: string) => {
  return prismaClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          // Use a transaction to ensure SET LOCAL and the query run on the same connection
          return prismaClient.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(
              `SET LOCAL app.current_user_id = '${userId}';`
            );
            return query(args);
          });
        },
      },
    },
  });
};

export default prismaClient;
