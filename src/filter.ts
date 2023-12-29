type StringOperators = 'eq' | 'ilike' | 'like' | 'neq' | 'nilike' | 'nlike';
type StringListOperators = 'in' | 'nin';
type NumberListOperators = 'in' | 'nin';
type NumberOperators = 'eq' | 'gt' | 'gte' | 'lt' | 'lte' | 'neq';
type DateTimeOperators = 'gt' | 'gte' | 'lt' | 'lte';

interface StringFilter {
  operator: StringOperators;
  value: string;
}

interface StringListFilter {
  operator: StringListOperators;
  value: string[];
}

interface NumberListFilter {
  operator: NumberListOperators;
  value: number[];
}

interface NumberFilter {
  operator: NumberOperators;
  value: number;
}

interface DateTimeFilter {
  operator: DateTimeOperators;
  value: string;
}

export interface ThreadFilter {
  attachmentsName?: StringListFilter;
  createdAt?: DateTimeFilter;
  afterCreatedAt?: DateTimeFilter;
  beforeCreatedAt?: DateTimeFilter;
  duration?: NumberFilter;
  environment?: StringFilter;
  feedbacksValue?: NumberListFilter;
  participantsIdentifier?: StringListFilter;
  search?: StringFilter;
  tokenCount?: NumberFilter;
}
