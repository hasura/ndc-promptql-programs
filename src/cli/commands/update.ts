import { Command, Option } from "commander";
import { ReadArtifactFiles } from "../../app/reader";
import {
  getConfigurationFilePath,
  getOutputFilePath,
  getPromptQLProgramsRootDir,
} from "../../util/paths";
import {
  GenerateFunctions,
  GenerateTypes,
  WriteStrToFile,
} from "../../app/writer";
import * as logger from "../../util/logger";

export function UpdateCommand(): Command {
  const updateCmd = new Command();
  updateCmd
    .name("update")
    .description(
      "Generate/Update the TS Lambda functions from PromptQL Program (Automations) artifact files",
    )
    .addOption(
      new Option(
        "--allow-relaxed-types [bool]",
        "Allow relaxed types when generating OPENDD schema",
      )
        .default(false)
        .choices(["true", "false"])
        .preset("true")
        .env("ALLOW_RELAXED_TYPES"),
    )
    .addOption(
      new Option(
        "--default-readonly [bool]",
        "Mark functions as readonly by default. Can be overridden by the program config.",
      )
        .default(true)
        .choices(["true", "false"])
        .preset("false")
        .env("DEFAULT_READONLY"),
    )
    .action(async (args, cmd) => {
      const allowRelaxedTypes = args.allowRelaxedTypes === "true";
      if (allowRelaxedTypes) {
        logger.warn("Allowing relaxed types");
      }
      const readonlyDefault = args.defaultReadonly === "true";
      logger.debug(`Readonly default: ${readonlyDefault}`);
      const automations = await ReadArtifactFiles(
        getPromptQLProgramsRootDir(),
        getConfigurationFilePath(),
      );
      const types = await GenerateTypes(automations);
      const functionsStr = await GenerateFunctions(
        automations,
        allowRelaxedTypes,
        readonlyDefault,
      );
      await WriteStrToFile(types, getOutputFilePath("types.ts"));
      await WriteStrToFile(functionsStr, getOutputFilePath("functions.ts"));
    });
  return updateCmd;
}
