import { API } from '../api';
import { Maybe, OmitUtils, Utils } from '../utils';
import { ScoreConstructor } from './score';

export type DatasetType = 'key_value' | 'generation';

class DatasetFields extends Utils {
  id!: string;
  createdAt!: string;
  name?: Maybe<string>;
  description?: Maybe<string>;
  metadata!: Record<string, any>;
  items!: Array<OmitUtils<DatasetItem>>;
  type?: DatasetType;
}

export type DatasetConstructor = OmitUtils<DatasetFields>;

export class Dataset extends DatasetFields {
  api: API;

  /**
   * Constructs a new Dataset instance.
   * @param api - The API instance to interact with backend services.
   * @param data - The initial data for the dataset.
   */
  constructor(api: API, data: DatasetConstructor) {
    super();
    this.api = api;
    Object.assign(this, data);
    if (!this.items) {
      this.items = [];
    }
    if (!this.type) {
      this.type = 'key_value';
    }
  }

  /**
   * Updates the dataset with new data.
   * @param dataset - The dataset data to update.
   * @returns The updated dataset instance.
   */
  async update(dataset: {
    name?: Maybe<string>;
    description?: Maybe<string>;
    metadata?: Maybe<Record<string, any>>;
  }) {
    const update_res = await this.api.updateDataset(this.id, dataset);
    this.name = update_res.name;
    this.description = update_res.description;
    this.metadata = update_res.metadata;
  }

  /**
   * Deletes the dataset.
   * @returns A promise that resolves when the dataset is deleted.
   */
  async delete() {
    return this.api.deleteDataset(this.id);
  }

  /**
   * Creates a new item in the dataset.
   * @param datasetItem - The new item to be added to the dataset.
   * @returns The newly created dataset item.
   */
  async createItem(datasetItem: {
    input: Record<string, any>;
    expectedOutput?: Maybe<Record<string, any>>;
    metadata?: Maybe<Record<string, any>>;
  }) {
    const item = await this.api.createDatasetItem(this.id, datasetItem);

    this.items.push(item);
    return item;
  }

  /**
   * Deletes an item from the dataset.
   * @param id - The ID of the item to delete.
   * @returns The deleted dataset item.
   */
  async deleteItem(id: string) {
    const deletedItem = await this.api.deleteDatasetItem(id);
    if (this.items) {
      this.items = this.items.filter((item) => item.id !== id);
    }
    return deletedItem;
  }

  /**
   * Creates a new experiment associated with the dataset.
   * @param experiment - The experiment details including name, optional prompt ID, and parameters.
   * @returns A new instance of DatasetExperiment containing the created experiment.
   */
  async createExperiment(experiment: {
    name: string;
    promptId?: string;
    params?: Record<string, any> | Array<Record<string, any>>;
  }) {
    const datasetExperiment = await this.api.createExperiment({
      name: experiment.name,
      datasetId: this.id,
      promptId: experiment.promptId,
      params: experiment.params
    });
    return new DatasetExperiment(this.api, datasetExperiment);
  }

  /**
   * Adds a step to the dataset.
   * @param stepId - The ID of the step to add.
   * @param metadata - Optional metadata for the step.
   * @returns The added dataset item.
   * @throws Error if the dataset type is 'generation'.
   */
  public async addStep(
    stepId: string,
    metadata?: Maybe<Record<string, unknown>>
  ) {
    if (this.type === 'generation') {
      throw new Error('Cannot add steps to a generation dataset');
    }
    const item = await this.api.addStepToDataset(this.id, stepId, metadata);
    this.items.push(item);
    return item;
  }

  /**
   * Adds a generation to the dataset.
   * @param generationId - The ID of the generation to add.
   * @param metadata - Optional metadata for the generation.
   * @returns The added dataset item.
   */
  public async addGeneration(
    generationId: string,
    metadata?: Maybe<Record<string, unknown>>
  ) {
    const item = await this.api.addGenerationToDataset(
      this.id,
      generationId,
      metadata
    );
    this.items.push(item);
    return item;
  }

  /**
   * Adds multiple generations to the dataset.
   * @param generationIds - The IDs of the steps to add.
   * @returns The added dataset items.
   */
  public async addGenerations(generationIds?: string[]) {
    if (generationIds == undefined || generationIds?.length === 0) {
      return [];
    }

    const items = await this.api.addGenerationsToDataset(
      this.id,
      generationIds
    );
    this.items = this.items.concat(items);
    return items;
  }
}

export class DatasetItem extends Utils {
  id!: string;
  createdAt!: string;
  datasetId!: string;
  metadata!: Record<string, any>;
  input!: Record<string, any>;
  expectedOutput?: Maybe<Record<string, any>>;
  intermediarySteps!: Array<Record<string, any>>;

  constructor(data: OmitUtils<DatasetItem>) {
    super();
    Object.assign(this, data);
  }
}

class DatasetExperimentItemFields extends Utils {
  id?: string;
  datasetExperimentId!: string;
  datasetItemId?: string;
  experimentRunId?: string;
  scores!: ScoreConstructor[];
  input?: Record<string, any>;
  output?: Record<string, any>;
}

export class DatasetExperiment extends Utils {
  id!: string;
  createdAt!: string;
  name!: string;
  datasetId?: string;
  promptId?: string;
  api: API;
  params!: Record<string, any> | Array<Record<string, any>>;
  items!: DatasetExperimentItem[];
  constructor(api: API, data: OmitUtils<DatasetExperiment>) {
    super();
    this.api = api;
    Object.assign(this, data);
    if (!this.items) {
      this.items = [];
    }
  }

  /**
   * Logs an item in the dataset experiment.
   * @param itemFields the data for this item
   * @returns the created item
   */
  async log(
    itemFields: Omit<
      OmitUtils<DatasetExperimentItemFields>,
      'id' | 'datasetExperimentId'
    >
  ) {
    const experimentRunId = this.api.client._currentExperimentItemRunId();

    const datasetExperimentItem = new DatasetExperimentItem({
      ...itemFields,
      datasetExperimentId: this.id,
      ...(experimentRunId && { experimentRunId })
    });

    const item = await this.api.createExperimentItem(datasetExperimentItem);

    this.items.push(item);
    return item;
  }
}

export type DatasetExperimentItemConstructor =
  OmitUtils<DatasetExperimentItemFields>;

export class DatasetExperimentItem extends DatasetExperimentItemFields {
  constructor(data: DatasetExperimentItemConstructor) {
    super();
    Object.assign(this, data);
  }
}
