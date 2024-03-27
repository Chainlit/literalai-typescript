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
  | Filter<'name', 'string', true>
  | Filter<'metadata', 'json', true>
  | Filter<'tokenCount', 'number', true>
  | Filter<'stepType', 'stringList'>
  | Filter<'stepName', 'string', true>
  | Filter<'stepOutput', 'json', true>
  | Filter<'tags', 'stringList', true>
  | Filter<'participantId', 'string', true>
  | Filter<'participantIdentifiers', 'stringList', true>
  | Filter<'scoreValue', 'number'>
  | Filter<'duration', 'number', true>;

export type ThreadsOrderBy = OrderBy<
  'createdAt' | 'tokenCount' | 'participant'
>;

export type GenerationsFilter =
  | Filter<'id', 'string'>
  | Filter<'createdAt', 'datetime'>
  | Filter<'error', 'string', true>
  | Filter<'provider', 'string', true>
  | Filter<'model', 'string', true>
  | Filter<'promptLineage', 'string', true>
  | Filter<'promptVersion', 'number', true>
  | Filter<'duration', 'number', true>
  | Filter<'score', 'number', true>
  | Filter<'tokenCount', 'number', true>
  | Filter<'tags', 'stringList', true>
  | Filter<'participant', 'stringList', true>;

export type GenerationsOrderBy = OrderBy<
  'createdAt' | 'duration' | 'model' | 'tokenCount' | 'provider'
>;

export type ScoresFilter =
  | Filter<'id', 'string'>
  | Filter<'createdAt', 'datetime'>
  | Filter<'participant', 'stringList', true>
  | Filter<'tags', 'stringList', true>
  | Filter<'name', 'string'>
  | Filter<'value', 'number'>
  | Filter<'type', 'string'>
  | Filter<'comment', 'string', true>;

export type ScoresOrderBy = OrderBy<'createdAt'>;

export type ParticipantsFilter =
  | Filter<'id', 'string'>
  | Filter<'createdAt', 'datetime'>
  | Filter<'identifier', 'stringList', true>
  | Filter<'lastEngaged', 'datetime', true>
  | Filter<'threadCount', 'number', true>
  | Filter<'tokenCount', 'number', true>
  | Filter<'metadata', 'json', true>;
