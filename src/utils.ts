export type Maybe<T> = T | null | undefined;

export type OmitUtils<T> = Omit<T, keyof Utils>;

export type Environment = 'dev' | 'staging' | 'prod' | 'experiment';

export type PageInfo = {
  hasNextPage: boolean;
  startCursor: string;
  endCursor: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  pageInfo: PageInfo;
};

export function isPlainObject(value: unknown): value is Record<string, any> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}

/**
 * Represents a utility class with serialization capabilities.
 */
export class Utils {
  /**
   * Serializes the properties of the current instance into a dictionary, excluding the 'api' property.
   * It handles nested objects that also implement a serialize method.
   *
   * @returns A dictionary representing the serialized properties of the object.
   */
  serialize(): any {
    const dict: any = {};
    Object.keys(this as any).forEach((key) => {
      if (['api', 'client'].includes(key)) {
        return;
      }
      if ((this as any)[key] !== undefined) {
        if (Array.isArray((this as any)[key])) {
          dict[key] = (this as any)[key].map((item: any) => {
            if (
              item instanceof Object &&
              typeof item.serialize === 'function'
            ) {
              return item.serialize();
            } else {
              return item;
            }
          });
        } else if (
          (this as any)[key] instanceof Object &&
          typeof (this as any)[key].serialize === 'function'
        ) {
          dict[key] = (this as any)[key].serialize();
        } else {
          dict[key] = (this as any)[key];
        }
      }
    });
    return dict;
  }
}

/**
 * Represents a user with optional metadata and identifier.
 */
export class User extends Utils {
  id?: Maybe<string>;
  identifier!: string;
  metadata?: Maybe<Record<string, any>>;

  constructor(data: OmitUtils<User>) {
    super();
    Object.assign(this, data);
  }
}

export function omitLiteralAiMetadata(obj: Record<string, unknown>) {
  const { literalaiTags, literalaiMetadata, literalaiStepId, ...rest } = obj;
  return rest;
}
