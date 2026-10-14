import { Inject, Optional } from '@nestjs/common';

/** Minimal database contract implemented by @mcd/database's Prisma service. */
export interface DatabaseClient {
  user: {
    findUnique(args: unknown): Promise<any>;
    create(args: unknown): Promise<any>;
    update(args: unknown): Promise<any>;
  };
  membership: {
    findFirst(args: unknown): Promise<any>;
    findMany(args: unknown): Promise<any[]>;
  };
  refreshToken: {
    create(args: unknown): Promise<any>;
    findFirst(args: unknown): Promise<any>;
    update(args: unknown): Promise<any>;
  };
}

export const DATABASE = Symbol('DATABASE');
export const InjectDatabase = () => Inject(DATABASE);
export const OptionalDatabase = () => {
  const decorator = Optional();
  return (target: object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    decorator(target, propertyKey, parameterIndex);
    Inject(DATABASE)(target, propertyKey, parameterIndex);
  };
};
