import * as sdk from "@hasura/ndc-lambda-sdk";
import axios from "axios";

export function mustEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function prepareExecuteProgramBody<I>(
  headers: sdk.JSONValue,
  input: I,
  code: string,
  buildVersion?: string,
): ExecuteProgramBody<I> {
  const body: ExecuteProgramBody<I> = {
    version: "v2",
    code,
    ...(buildVersion || headers
      ? {
          ddn: {
            ...(buildVersion ? { build_version: buildVersion } : {}),
            ...(headers
              ? { headers: headers.value as Record<string, any> }
              : {}),
          },
        }
      : {}),
    artifacts: [
      {
        identifier: "input",
        title: "Input",
        artifact_type: "table",
        data: input,
      },
    ],
  };
  return body;
}

export async function makeExecuteProgramRequest<I, O>(
  body: ExecuteProgramBody<I>,
  apiKey: string,
  executeProgramEndpoint: string,
): Promise<ProgramOutput<O>> {
  try {
    const response = await axios.post<ProgramOutput<O>>(
      executeProgramEndpoint,
      body,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: getTimeout(),
        maxRedirects: 0,
      },
    );
    if (response.status !== 200) {
      throw new Error(`HTTP error status: ${response.status}`);
    }
    return response.data;
  } catch (e) {
    throw new Error(`Program Execution error: ${e}`);
  }
}

function getTimeout(): number {
  if (process.env["PROGRAM_EXECUTION_TIMEOUT"]) {
    return parseInt(process.env["PROGRAM_EXECUTION_TIMEOUT"]!);
  }
  // 600s timeout
  return 600000;
}

export type ExecuteProgramBody<T> = {
  version: "v2";
  code: string;
  ddn?: {
    build_version?: string;
    headers?: Record<string, any>;
  };
  artifacts: Artifact<T>[];
};

export type Artifact<T> = {
  identifier: string;
  title: string;
  artifact_type: string;
  data: T;
};

export type ProgramOutput<T> = {
  output: string;
  error?: string | null;
  accessed_artifact_ids: string[];
  modified_artifacts: Artifact<T>[];
  llm_usages: LlmUsage[];
};

export type LlmUsage = {
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
};
