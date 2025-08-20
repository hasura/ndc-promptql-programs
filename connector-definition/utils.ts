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

function processErrorFromResponse<O>(
  output: ProgramOutput<O>,
): ProgramOutput<O> {
  if (output.error) {
    throw new sdk.BadGateway(
      `Program execution failed with error: ${output.error}`,
      {
        output: output.output,
      },
    );
  }
  return output;
}

export async function makeExecuteProgramRequest<I, O>(
  body: ExecuteProgramBody<I>,
  apiKey: string,
  executeProgramEndpoint: string,
): Promise<ProgramOutput<O>> {
  let response;
  try {
    response = await axios.post<ProgramOutput<O>>(
      executeProgramEndpoint,
      body,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: getTimeout(),
        maxRedirects: 0,
        validateStatus: (status) => status === 200,
      },
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const data = error.response.data;
        throw new sdk.BadGateway(
          `Program invocation failed with HTTP ${status}`,
          {
            status,
            data,
          },
        );
      } else if (error.request) {
        // Network error or timeout
        if (error.code === "ECONNABORTED") {
          throw new sdk.BadGateway(
            `Program invocation timed out after ${getTimeout()}ms`,
          );
        }
        throw new sdk.BadGateway(
          `Network error during program invocation: ${error.message}`,
        );
      }
      // Unknown error
      throw new sdk.BadGateway(
        `Error occurred during program invocation: ${error.message}`,
      );
    }
    // Re-throw unexpected errors with context
    throw new sdk.InternalServerError(
      `Program invocation error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  return processErrorFromResponse(response.data);
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
