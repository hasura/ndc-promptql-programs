import { GenerateTypes, GenerateFunctions, WriteStrToFile } from "./writer";
import { Automation } from "../automation";
import fs from "fs";
import path from "path";
import os from "os";

describe("GenerateTypes", () => {
  it("should generate TypeScript types from automation schemas", async () => {
    const mockAutomations: Automation[] = [
      {
        fileName: "test.json",
        artifact: {
          identifier: "sum_numbers",
          title: "Sum Numbers (From 1 to 5)",
          artifact_type: "automation",
          data: {
            code: '# Identifier: sum_numbers\n# Input Schema: {"type": "array", "items": {"type": "object", "properties": {"number1": {"type": "number"}, "number2": {"type": "number"}}}}\n# Output Schema: {"type": "array", "items": {"type": "object", "properties": {"sum": {"type": "number"}}}}\n\n# Get input data\ninput_data = executor.get_artifact(\'input\')\nnumber1 = input_data[0][\'number1\']\nnumber2 = input_data[0][\'number2\']\n\n# Calculate sum\nresult = [{\'sum\': number1 + number2}]\n\n# Store the result\nexecutor.store_artifact(\'output\', \'Sum Result\', \'table\', result)',
            input_schema: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  number1: {
                    type: "number",
                  },
                  number2: {
                    type: "number",
                  },
                },
              },
            },
            output_schema: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  sum: {
                    type: "number",
                  },
                },
              },
            },
          },
        },
      },
    ];

    const result = await GenerateTypes(mockAutomations);
    expect(
      `export type SumNumbersFrom1To5Input = {
  number1?: number;
  number2?: number;
}[];

export type SumNumbersFrom1To5Output = {
  sum?: number;
}[];
`
    ).toEqual(result);
  });
});

describe("GenerateFunctions", () => {
  it("should generate TypeScript functions from automation schemas", async () => {
    const mockAutomations: Automation[] = [
      {
        fileName: "test.json",
        artifact: {
          identifier: "sum_numbers",
          title: "Sum Numbers (From 1 to 5)",
          artifact_type: "automation",
          data: {
            code: '# Identifier: sum_numbers\n# Input Schema: {"type": "array", "items": {"type": "object", "properties": {"number1": {"type": "number"}, "number2": {"type": "number"}}}}\n# Output Schema: {"type": "array", "items": {"type": "object", "properties": {"sum": {"type": "number"}}}}\n\n# Get input data\ninput_data = executor.get_artifact(\'input\')\nnumber1 = input_data[0][\'number1\']\nnumber2 = input_data[0][\'number2\']\n\n# Calculate sum\nresult = [{\'sum\': number1 + number2}]\n\n# Store the result\nexecutor.store_artifact(\'output\', \'Sum Result\', \'table\', result)',
            input_schema: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  number1: {
                    type: "number",
                  },
                  number2: {
                    type: "number",
                  },
                },
              },
            },
            output_schema: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  sum: {
                    type: "number",
                  },
                },
              },
            },
          },
        },
      },
    ];

    const result = await GenerateFunctions(mockAutomations);

    const expectedResult = `import * as sdk from "@hasura/ndc-lambda-sdk";
import * as types from "./types";
import * as utils from "./utils";

const buildVersion = process.env["PROMPTQL_BUILD_VERSION"];
const apiKey = utils.mustEnv("PROMPTQL_API_KEY");
const executeProgramEndpoint = utils.mustEnv(
  "PROMPTQL_EXECUTE_PROGRAM_ENDPOINT"
);

/**
 * @readonly
 */
export async function sumNumbersFrom1To5(
  headers: sdk.JSONValue,
  input: types.SumNumbersFrom1To5Input
): Promise<utils.ProgramOutput<types.SumNumbersFrom1To5Output>> {
  const code = \`# Identifier: sum_numbers\n# Input Schema: {"type": "array", "items": {"type": "object", "properties": {"number1": {"type": "number"}, "number2": {"type": "number"}}}}\n# Output Schema: {"type": "array", "items": {"type": "object", "properties": {"sum": {"type": "number"}}}}\n\n# Get input data\ninput_data = executor.get_artifact(\'input\')\nnumber1 = input_data[0][\'number1\']\nnumber2 = input_data[0][\'number2\']\n\n# Calculate sum\nresult = [{\'sum\': number1 + number2}]\n\n# Store the result\nexecutor.store_artifact(\'output\', \'Sum Result\', \'table\', result)\`;
  const body = utils.prepareExecuteProgramBody(
    headers,
    input,
    code,
    buildVersion
  );
  const response = await utils.makeExecuteProgramRequest<
    types.SumNumbersFrom1To5Input,
    types.SumNumbersFrom1To5Output
  >(body, apiKey, executeProgramEndpoint);
  return response;
}
`;

    expect(result).toEqual(expectedResult);
  });
});

describe("WriteStrToFile", () => {
  it("should create directories and write file when directory doesn't exist", async () => {
    // Create a temporary directory for testing
    const tempDir = path.join(os.tmpdir(), "test-writer-" + Date.now());
    const nestedDir = path.join(tempDir, "nested", "deep", "directory");
    const filePath = path.join(nestedDir, "test.txt");
    const testContent = "Hello, World!";

    try {
      // Ensure the directory doesn't exist initially
      expect(fs.existsSync(nestedDir)).toBe(false);

      // Write the file (should create directories)
      await WriteStrToFile(testContent, filePath);

      // Verify the directory was created
      expect(fs.existsSync(nestedDir)).toBe(true);

      // Verify the file was written with correct content
      const fileContent = await fs.promises.readFile(filePath, "utf8");
      expect(fileContent).toBe(testContent);
    } finally {
      // Clean up: remove the temporary directory
      if (fs.existsSync(tempDir)) {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      }
    }
  });

  it("should write file when directory already exists", async () => {
    // Create a temporary directory for testing
    const tempDir = path.join(
      os.tmpdir(),
      "test-writer-existing-" + Date.now()
    );
    const filePath = path.join(tempDir, "existing.txt");
    const testContent = "Content for existing directory";

    try {
      // Create the directory first
      await fs.promises.mkdir(tempDir, { recursive: true });
      expect(fs.existsSync(tempDir)).toBe(true);

      // Write the file
      await WriteStrToFile(testContent, filePath);

      // Verify the file was written with correct content
      const fileContent = await fs.promises.readFile(filePath, "utf8");
      expect(fileContent).toBe(testContent);
    } finally {
      // Clean up: remove the temporary directory
      if (fs.existsSync(tempDir)) {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      }
    }
  });
});
