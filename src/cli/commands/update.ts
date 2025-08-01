import { Command } from "commander";
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

export function UpdateCommand(): Command {
  const updateCmd = new Command();
  updateCmd
    .name("update")
    .description(
      "Generate/Update the TS Lambda functions from PromptQL Program (Automations) artifact files"
    )
    .action(async () => {
      const automations = await ReadArtifactFiles(getPromptQLProgramsRootDir());
      const types = await GenerateTypes(automations);
      const functionsStr = await GenerateFunctions(automations);
      await WriteStrToFile(types, getOutputFilePath("types.ts"));
      await WriteStrToFile(functionsStr, getOutputFilePath("functions.ts"));
    });
  return updateCmd;
}
