import { v4 as uuidv4 } from 'uuid';

import { Maybe, OmitUtils, Utils } from '../utils';

/**
 * Represents an attachment with optional metadata, MIME type, and other properties.
 * It extends the `Utils` class for serialization capabilities.
 */
export class Attachment extends Utils {
  id?: Maybe<string>;
  metadata?: Maybe<Record<string, any>>;
  mime?: Maybe<string>;
  name: Maybe<string>;
  objectKey?: Maybe<string>;
  url?: Maybe<string>;

  constructor(data: OmitUtils<Attachment>) {
    super();
    Object.assign(this, data);
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}
