import { camelCase, upperFirst } from "lodash";
import { Automation, ProgramConfiguration } from "../automation";
import { compile } from "json-schema-to-typescript";
import os from "os";
import fs from "fs";
import path from "path";
import { JSONSchema4 } from "json-schema";

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
    .replace(/\\/g, "\\\\") // Escape backslashes
    .replace(/`/g, "\\`") // Escape backticks
    .replace(/\$/g, "\\$"); // Escape dollar signs
};

export const addTitleToObjectInArray = (
  schema: JSONSchema4,
  rootTitle: string,
): JSONSchema4 => {
  // Deep clone the schema to avoid mutating the original
  const modifiedSchema = JSON.parse(JSON.stringify(schema));

  // Helper to recursively process the schema
  const processSchema = (
    currentSchema: JSONSchema4,
    parentPath: string[] = [],
    isInArray: boolean = false,
  ): JSONSchema4 => {
    // Only objects can have properties/titles
    if (typeof currentSchema !== "object" || currentSchema === null) {
      return currentSchema;
    }

    const processed: JSONSchema4 = { ...currentSchema };

    // Helper function to check if a type includes a specific type
    const includesType = (
      typeValue: string | string[] | undefined,
      targetType: string,
    ): boolean => {
      if (!typeValue) return false;
      if (typeof typeValue === "string") return typeValue === targetType;
      if (Array.isArray(typeValue)) return typeValue.includes(targetType);
      return false;
    };

    // Add title if this is an object inside an array
    if (isInArray && includesType(processed.type, "object")) {
      const titlePath = parentPath.length > 0 ? parentPath.join("_") : "item";
      const generatedTitle = `${rootTitle}_${titlePath}`;

      if (processed.title) {
        // If title already exists, prefix it with the generated title
        processed.title = `${generatedTitle}_${processed.title}`;
      } else {
        // If no title exists, use the generated title
        processed.title = generatedTitle;
      }
    }

    // Recurse into array items
    if (includesType(processed.type, "array") && processed.items) {
      if (Array.isArray(processed.items)) {
        processed.items = processed.items.map((item, idx) =>
          processSchema(
            item as JSONSchema4,
            [...parentPath, `item${idx}`],
            true,
          ),
        );
      } else {
        processed.items = processSchema(
          processed.items as JSONSchema4,
          [...parentPath, "item"],
          true,
        );
      }
    }

    // Recurse into object properties
    if (includesType(processed.type, "object") && processed.properties) {
      const newProperties: { [key: string]: JSONSchema4 } = {};
      for (const [propName, propSchema] of Object.entries(
        processed.properties,
      )) {
        newProperties[propName] = processSchema(
          propSchema as JSONSchema4,
          [...parentPath, propName],
          false,
        );
      }
      processed.properties = newProperties;
    }

    // Recurse into additionalProperties if it's a schema
    if (
      includesType(processed.type, "object") &&
      processed.additionalProperties &&
      typeof processed.additionalProperties === "object"
    ) {
      processed.additionalProperties = processSchema(
        processed.additionalProperties as JSONSchema4,
        [...parentPath, "additionalProperties"],
        false,
      );
    }

    return processed;
  };

  // Set root title if not present
  if (!modifiedSchema.title) {
    modifiedSchema.title = rootTitle;
  }

  return processSchema(modifiedSchema);
};

export const GenerateTypes = async (
  automations: Automation[],
): Promise<string> => {
  const types: string[] = [];
  for (const automation of automations) {
    const functionName = FunctionName(automation.artifact.title);
    const inputTypeName = InputTypeName(functionName);
    const outputTypeName = OutputTypeName(functionName);
    const inputSchema = addTitleToObjectInArray(
      automation.artifact.data.input_schema,
      inputTypeName,
    );
    const inputTypeStr = await compile(inputSchema as any, inputTypeName, {
      additionalProperties: false,
      bannerComment: "",
      format: true,
    });
    const outputSchema = addTitleToObjectInArray(
      automation.artifact.data.output_schema,
      outputTypeName,
    );
    const outputTypeStr = await compile(outputSchema as any, outputTypeName, {
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
  allowRelaxedTypes = false,
  readonlyDefault = true,
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

  let functions: string[] = [];
  for (const automation of automations) {
    const functionName = FunctionName(automation.artifact.title);
    const inputTypeName = InputTypeName(functionName);
    const outputTypeName = OutputTypeName(functionName);

    const inputTypeSig = `types.${inputTypeName}`;
    const outputTypeSig = `types.${outputTypeName}`;

    let functionStr = "";
    const comment = getFunctionCommentStr({
      readonlyDefault: readonlyDefault,
      allowRelaxedTypes,
      programConfig: automation.programConfig,
    });
    if (comment) {
      functionStr = functionStr + comment;
    }
    functionStr =
      functionStr +
      `export async function ${functionName}(
  headers: sdk.JSONValue,
  input: ${inputTypeSig}
): Promise<utils.ProgramOutput<${outputTypeSig}>> {
  const code = \`${escapeCodeForTemplateLiteral(automation.artifact.data.code)}\`;
  const body = utils.prepareExecuteProgramBody(
    headers,
    input,
    code,
    buildVersion
  );
  const response = await utils.makeExecuteProgramRequest<
    ${inputTypeSig},
    ${outputTypeSig}
  >(body, apiKey, executeProgramEndpoint);
  return response;
}
`;
    functions.push(functionStr);
  }
  out += functions.join(os.EOL);
  return out;
};

function getFunctionCommentStr(comment: {
  readonlyDefault: boolean;
  allowRelaxedTypes?: boolean;
  programConfig?: ProgramConfiguration;
}): string {
  const commentStr: string[] = [];
  let isReadonly = comment.readonlyDefault;
  if (comment.programConfig?.readonly !== undefined) {
    isReadonly = comment.programConfig.readonly;
  }
  if (comment.programConfig?.description) {
    commentStr.push(` * ${comment.programConfig?.description}`);
  }
  if (isReadonly) {
    commentStr.push(` * @readonly`);
  }
  if (comment.allowRelaxedTypes) {
    commentStr.push(` * @allowrelaxedtypes`);
  }
  if (commentStr.length === 0) {
    return "";
  }
  return `/**${os.EOL}` + commentStr.join(os.EOL) + `${os.EOL} */${os.EOL}`;
}

export const WriteStrToFile = async (str: string, filePath: string) => {
  // Create directory if it doesn't exist
  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });

  // Write the file
  await fs.promises.writeFile(filePath, str, { encoding: "utf8" });

  // Explicitly set permissions to -rw-rw-rw-
  await fs.promises.chmod(filePath, 0o666);
};
