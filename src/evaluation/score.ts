import { Maybe, OmitUtils, Utils } from '../utils';

export type ScoreType = 'HUMAN' | 'AI';

class ScoreFields extends Utils {
  id?: Maybe<string>;
  stepId?: Maybe<string>;
  generationId?: Maybe<string>;
  datasetExperimentItemId?: Maybe<string>;
  name: string = 'user-feedback';
  value: number = 0;
  type: ScoreType = 'AI';
  scorer?: Maybe<string>;
  comment?: Maybe<string>;
  tags?: Maybe<string[]>;
}

export type ScoreConstructor = OmitUtils<ScoreFields>;

/**
 * Represents a score entity with properties to track various aspects of scoring.
 * It extends the `Utils` class for serialization capabilities.
 */
export class Score extends ScoreFields {
  constructor(data: ScoreConstructor) {
    super();
    Object.assign(this, data);
  }
}
