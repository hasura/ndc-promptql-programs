import fs from "fs";
import path from "path";
import camelCase from "lodash/camelCase";
import { Artifact, Automation } from "../automation";

export const ReadArtifactFiles = async (
  rootDir: string,
): Promise<Automation[]> => {
  // Validate if rootDir exists
  if (!fs.existsSync(rootDir)) {
    throw new Error(`Directory does not exist: ${rootDir}`);
  }

  const automations: Automation[] = [];

  // Recursive function to traverse directories
  const traverseDirectory = async (dir: string): Promise<void> => {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await traverseDirectory(fullPath);
      } else if (entry.isFile() && path.extname(entry.name) === ".json") {
        try {
          const content = await fs.promises.readFile(fullPath, "utf-8");
          const artifact = JSON.parse(content) as Artifact;

          automations.push({
            fileName: fullPath,
            config: artifact,
          });
        } catch (e) {
          throw new Error(`Failed to read or parse ${fullPath}: ${e}`);
        }
      }
    }
  };

  await traverseDirectory(rootDir);
  validateUniqueFunctionNames(automations);
  validate(automations);
  return automations;
};

const validateUniqueFunctionNames = (automations: Automation[]) => {
  const names = new Set<string>();
  for (const automation of automations) {
    const transformedName = camelCase(automation.config.title);
    if (names.has(transformedName)) {
      throw new Error(
        `Duplicate name found: ${automation.config.title} in ${automation.fileName}`,
      );
    }
    names.add(transformedName);
  }
};

const validate = (automations: Automation[]) => {
  for (const automation of automations) {
    if (!automation.config.title) {
      throw new Error(`Missing title in ${automation.fileName}`);
    }
    if (!automation.config.artifact_type) {
      throw new Error(`${automation.fileName} is not an automation`);
    }
    if (!automation.config.data.input_schema) {
      throw new Error(`Missing input_schema in ${automation.fileName}`);
    }
    if (!automation.config.data.output_schema) {
      throw new Error(`Missing output_schema in ${automation.fileName}`);
    }
    if (!automation.config.data.code) {
      throw new Error(`Missing code in ${automation.fileName}`);
    }
  }
};
