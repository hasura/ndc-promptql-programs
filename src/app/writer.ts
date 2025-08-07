import { camelCase, upperFirst } from "lodash";
import { Automation } from "../automation";
import { compile } from "json-schema-to-typescript";
import os from "os";
import fs from "fs";
import path from "path";

const InputTypeName = (functionName: string): string => {
  return upperFirst(camelCase(functionName + "Input"));
};

const OutputTypeName = (functionName: string): string => {
  return upperFirst(camelCase(functionName + "Output"));
};

const FunctionName = (title: string): string => {
  return camelCase(title);
};

const escapeCodeForTemplateLiteral = (code: string): string => {
  return code
    .replace(/\\/g, '\\\\')  // Escape backslashes
    .replace(/`/g, '\\`')    // Escape backticks
    .replace(/\$/g, '\\$');  // Escape dollar signs
};

export const GenerateTypes = async (
  automations: Automation[]
): Promise<string> => {
  const types: string[] = [];
  for (const automation of automations) {
    const functionName = FunctionName(automation.config.title);
    const inputTypeName = InputTypeName(functionName);
    const outputTypeName = OutputTypeName(functionName);
    const inputSchema = automation.config.data.input_schema;
    const outputSchema = automation.config.data.output_schema;
    const inputTypeStr = await compile(inputSchema, inputTypeName, {
      additionalProperties: false,
      bannerComment: "",
      format: true,
    });
    const outputTypeStr = await compile(outputSchema, outputTypeName, {
      additionalProperties: false,
      bannerComment: "",
      format: true,
    });
    types.push(inputTypeStr);
    types.push(outputTypeStr);
  }

  return types.join(os.EOL);
};

export const GenerateFunctions = async (
  automations: Automation[],
  allowRelaxedTypes = false
): Promise<string> => {
  let out = `import * as sdk from "@hasura/ndc-lambda-sdk";
import * as types from "./types";
import * as utils from "./utils";

const buildVersion = process.env["PROMPTQL_BUILD_VERSION"];
const apiKey = utils.mustEnv("PROMPTQL_API_KEY");
const executeProgramEndpoint = utils.mustEnv(
  "PROMPTQL_EXECUTE_PROGRAM_ENDPOINT"
);

`;
  const relaxedTypesComment = `/**
 * @allowrelaxedtypes
 */
`;
  let functions: string[] = [];
  for (const automation of automations) {
    const functionName = FunctionName(automation.config.title);
    const inputTypeName = InputTypeName(functionName);
    const outputTypeName = OutputTypeName(functionName);
    let functionStr = "";
    if (allowRelaxedTypes) {
      functionStr = functionStr + relaxedTypesComment;
    }
    functionStr =
      functionStr +
      `export async function ${functionName}(
  headers: sdk.JSONValue,
  input: types.${inputTypeName}
): Promise<utils.ProgramOutput<types.${outputTypeName}>> {
  const code = \`${escapeCodeForTemplateLiteral(automation.config.data.code)}\`;
  const body = utils.prepareExecuteProgramBody(
    headers,
    input,
    code,
    buildVersion
  );
  const response = await utils.makeExecuteProgramRequest<
    types.${inputTypeName},
    types.${outputTypeName}
  >(body, apiKey, executeProgramEndpoint);
  return response;
}
`;
    functions.push(functionStr);
  }
  out += functions.join(os.EOL);
  return out;
};

export const WriteStrToFile = async (str: string, filePath: string) => {
  // Create directory if it doesn't exist
  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });

  // Write the file
  await fs.promises.writeFile(filePath, str, { encoding: "utf8" });

  // Explicitly set permissions to -rw-rw-rw-
  await fs.promises.chmod(filePath, 0o666);
};
