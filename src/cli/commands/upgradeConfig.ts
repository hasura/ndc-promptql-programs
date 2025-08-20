import { Command } from "commander";
import * as logger from "../../util/logger";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { getUserMountedFilePath } from "../../util/paths";

export function UpgradeConfig(): Command {
  const upgradeCmd = new Command();
  upgradeCmd
    .name("upgrade-configuration")
    .description("Upgrade Programs connector configuration to current version")
    .action(async (args, cmd) => {
      const targetSdkVersion = await readSdkVersionFromPackageJson(
        path.join("/app", "connector-definition", "package.json"),
      );
      logger.info(`Upgrading SDK to version: ${targetSdkVersion}`);
      const rootDir = getUserMountedFilePath();
      const currentSdkVersion = await readSdkVersionFromPackageJson(
        path.join(rootDir, "package.json"),
      );
      logger.info(`Current SDK version: ${currentSdkVersion}`);
      try {
        await upgradePackageJson(rootDir, targetSdkVersion);
        await fs.promises.chmod(path.join(rootDir, "package.json"), 0o666);
        await fs.promises.chmod(path.join(rootDir, "package-lock.json"), 0o666);
      } catch (error) {
        logger.error(`Failed to upgrade SDK: ${error}`);
        logger.info(
          `Please manually upgrade the @hasura/ndc-lambda-sdk package in your package.json to version ${targetSdkVersion}`,
        );
      }

      logger.info("Upgrading utils.ts");
      await upgradeUtilsTs(
        path.join("/app", "connector-definition", "utils.ts"),
        path.join(rootDir, "utils.ts"),
      );

      logger.info("Upgrade configuration.json files");
      await upgradeConfigurationJson(
        path.join("/app", "connector-definition", "configuration.schema.json"),
        path.join("/app", "connector-definition", "configuration.json"),
        path.join(rootDir, "configuration.schema.json"),
        path.join(rootDir, "configuration.json"),
      );

      logger.info("Upgrade complete");
    });
  return upgradeCmd;
}

async function upgradeConfigurationJson(
  sourceConfigSchemaFilePath: string,
  sourceConfigFilePath: string,
  targetConfigSchemaFilePath: string,
  targetConfigFilePath: string,
): Promise<void> {
  const sourceConfigSchemaFileContent = await fs.promises.readFile(
    sourceConfigSchemaFilePath,
    "utf-8",
  );
  await fs.promises.writeFile(
    targetConfigSchemaFilePath,
    sourceConfigSchemaFileContent,
    "utf-8",
  );
  await fs.promises.chmod(targetConfigSchemaFilePath, 0o666);
  // If targetConfigFilePath does not exist, create it from sourceConfigFilePath
  if (!fs.existsSync(targetConfigFilePath)) {
    const sourceConfigFileContent = await fs.promises.readFile(
      sourceConfigFilePath,
      "utf-8",
    );
    await fs.promises.writeFile(
      targetConfigFilePath,
      sourceConfigFileContent,
      "utf-8",
    );
    await fs.promises.chmod(targetConfigFilePath, 0o666);
  }
}

async function upgradeUtilsTs(
  sourceUtilsFilePath: string,
  targetUtilsFilePath: string,
) {
  const sourceUtilsFileContent = await fs.promises.readFile(
    sourceUtilsFilePath,
    "utf-8",
  );
  await fs.promises.writeFile(
    targetUtilsFilePath,
    sourceUtilsFileContent,
    "utf-8",
  );
  await fs.promises.chmod(targetUtilsFilePath, 0o666);
}

async function readSdkVersionFromPackageJson(
  packageJsonPath: string,
): Promise<string> {
  try {
    const packageJsonContent = await fs.promises.readFile(
      packageJsonPath,
      "utf-8",
    );
    const packageJson = JSON.parse(packageJsonContent);
    const sdkVersion = packageJson.dependencies?.["@hasura/ndc-lambda-sdk"];

    if (!sdkVersion) {
      throw new Error(
        `@hasura/ndc-lambda-sdk not found in dependencies at ${packageJsonPath}`,
      );
    }

    return sdkVersion;
  } catch (error) {
    throw new Error(
      `Failed to read SDK version from ${packageJsonPath}: ${error}`,
    );
  }
}

/**
 * Adapted from https://github.com/hasura/ndc-nodejs-lambda/blob/a1c81fd4f1bf07a9f36d1e17262c9149c93df6d3/connector-definition/scripts/upgrade-connector.sh#L49
 * @param rootDir
 * @param targetSdkVersion
 * @returns
 */
async function upgradePackageJson(
  rootDir: string,
  targetSdkVersion: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      "install",
      `@hasura/ndc-lambda-sdk@${targetSdkVersion}`,
      "--save-exact",
      "--no-update-notifier",
      "--package-lock-only",
    ];

    const npmProcess = spawn("npm", args, {
      cwd: rootDir,
      stdio: "inherit",
    });

    npmProcess.on("close", (code) => {
      if (code === 0) {
        logger.info(
          `Successfully upgraded @hasura/ndc-lambda-sdk to version ${targetSdkVersion}`,
        );
        resolve();
      } else {
        reject(new Error(`npm install failed with exit code ${code}`));
      }
    });

    npmProcess.on("error", (error) => {
      reject(new Error(`Failed to run npm install: ${error.message}`));
    });
  });
}
