import { JSONSchema4 } from "json-schema";
export type Artifact = {
  identifier: string;
  title: string;
  artifact_type: string;
  data: Data;
};

export type Data = {
  code: string;
  input_schema: JSONSchema4;
  output_schema: JSONSchema4;
};

export type Automation = {
  fileName: string;
  artifact: Artifact;
  programConfig?: ProgramConfiguration;
};

/**
 * Configuration for generating the function for the program.
 */
export type ProgramConfiguration = {
  /**
   * Mark the function as readonly.
   */
  readonly?: boolean;
  /**
   * Description of the function.
   */
  description?: string;
};

export type ProgramConfigs = {
  $schema: string | null;
  /**
   * Program Configuration. Program identifier is the key for each config.
   */
  programs?: {
    [programIdentifier: string]: ProgramConfiguration;
  };
};
