#!/usr/bin/env node

import { Command } from "commander";
import { UpdateCommand } from "./commands/update";
import { UpgradeConfig } from "./commands/upgradeConfig";

const program = new Command();
program
  .name("ndc-promptql-programs")
  .description(
    "CLI to create NDC TS Lambda functions from PromptQL Program (Automations) artifact files",
  )
  .version("0.5.0");

program.addCommand(UpdateCommand());
program.addCommand(UpgradeConfig());

program.parseAsync();
