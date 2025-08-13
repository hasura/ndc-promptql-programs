import { Command, Option } from "commander";
import { ReadArtifactFiles } from "../../app/reader";
import {
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
      "Generate/Update the TS Lambda functions from PromptQL Program (Automations) artifact files"
    )
    .addOption(
      new Option(
        "--allow-relaxed-types [bool]",
        "Allow relaxed types when generating OPENDD schema"
      )
        .default(false)
        .choices(["true", "false"])
        .preset("true")
        .env("ALLOW_RELAXED_TYPES")
    )
    .addOption(
      new Option(
        "--read-only [bool]",
        "Set functions as read-only"
      )
        .default(true)
        .choices(["true", "false"])
        .preset("true")
        .env("READ_ONLY")
    )
    .action(async (args, cmd) => {
      const allowRelaxedTypes = args.allowRelaxedTypes === "true";
      const readOnly = args.readOnly === "true";
      if (allowRelaxedTypes) {
        logger.warn("Allowing relaxed types");
      }
      if (readOnly) {
        logger.warn("Setting functions as read-only");
      }
      const automations = await ReadArtifactFiles(getPromptQLProgramsRootDir());
      const types = await GenerateTypes(automations);
      const functionsStr = await GenerateFunctions(
        automations,
        allowRelaxedTypes,
        readOnly
      );
      await WriteStrToFile(types, getOutputFilePath("types.ts"));
      await WriteStrToFile(functionsStr, getOutputFilePath("functions.ts"));
    });
  return updateCmd;
}
