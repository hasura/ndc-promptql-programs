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

export type ProgramConfiguration = {
  readonly?: boolean;
  description?: string;
};

export type ProgramConfigFile = {
  [programIdentifier: string]: ProgramConfiguration;
};
