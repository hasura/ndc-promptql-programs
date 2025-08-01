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
  config: Artifact;
};
