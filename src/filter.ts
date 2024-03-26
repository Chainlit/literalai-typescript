type StringOperators = 'eq' | 'ilike' | 'neq' | 'nilike';
type StringListOperators = 'in' | 'nin';
type NumberListOperators = 'in' | 'nin';
type NumberOperators = 'eq' | 'gt' | 'gte' | 'lt' | 'lte' | 'neq';
type DateTimeOperators = 'gt' | 'gte' | 'lt' | 'lte';
type BooleanOperators = 'is' | 'nis';
type OptionalOperators = 'is' | 'nis';

type DataTypeOperators = {
  json: StringOperators;
  string: StringOperators;
  number: NumberOperators;
  stringList: StringListOperators;
  numberList: NumberListOperators;
  datetime: DateTimeOperators;
  boolean: BooleanOperators;
  optional: OptionalOperators;
};

type DataTypeValueType = {
  json: string;
  string: string;
  number: number;
  stringList: string[];
  numberList: number[];
  datetime: string;
  boolean: boolean;
  optional: null;
};

type Filter<
  F,
  DT extends keyof DataTypeOperators,
  O extends boolean = false
> = {
  path?: string;
  field: F;
  operator: O extends true
    ? DataTypeOperators[DT] | DataTypeOperators['optional']
    : DataTypeOperators[DT];
  value: O extends true
    ? DataTypeValueType[DT] | DataTypeValueType['optional']
    : DataTypeValueType[DT];
};

type OrderBy<Cols extends string> = {
  column: Cols;
  direction: 'ASC' | 'DESC';
};

export type ThreadsFilter =
  | Filter<'id', 'string'>
  | Filter<'createdAt', 'datetime'>
  | Filter<'participantId', 'string', true>
  | Filter<'name', 'string', true>
  | Filter<'metadata', 'json', true>
  | Filter<'tokenCount', 'number', true>
  | Filter<'tags', 'stringList', true>
  | Filter<'participantIdentifiers', 'stringList', true>
  | Filter<'scoreValue', 'number'>
  | Filter<'duration', 'number', true>;

export type ThreadsOrderBy = OrderBy<
  'createdAt' | 'tokenCount' | 'participant'
>;
