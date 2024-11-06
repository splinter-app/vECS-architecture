#!/usr/bin/env node

import { execSync } from "child_process";
import { Command } from "commander";
import inquirer from "inquirer";
import kleur = require("kleur");
import * as fs from "fs";
import * as path from "path";

import { askSourceQuestions } from "./configQuestions/sourceQuestions";
import { askDestinationQuestions } from "./configQuestions/destinationQuestions";
import { askEmbeddingQuestions } from "./configQuestions/embeddingQuestions";
import { askChunkQuestions } from "./configQuestions/chunkQuestions";
import { askAWSQuestions } from "./configQuestions/awsQuestions";

// Read and display the logo

function displayWelcome() {
  const logoPath = path.join(__dirname, "logo.txt");
  const logo = fs.readFileSync(logoPath, "utf8");
  console.log(kleur.red().bold(logo));
  console.log(kleur.green("Welcome to the Splinter Deploy CLI!"));
}

const program = new Command();

program
  .name("deploy-cli")
  .description(
    "CLI tool for deploying AWS CDK stacks with custom configurations."
  )
  .version("1.0.0");

program
  .command("deploy")
  .description("Deploy the CDK stack with specified options.")
  .action(async () => {
    displayWelcome();
    const awsKeys = await askAWSQuestions();
    let envObject = { ...awsKeys };

    const source = await askSourceQuestions(envObject);
    const destination = await askDestinationQuestions(envObject);
    const embedding = await askEmbeddingQuestions(envObject);
    const chunkSettings = await askChunkQuestions(envObject);

    const fullConfig = {
      ...source,
      ...destination,
      ...embedding,
      ...chunkSettings,
    };

    console.log("Deploying with the following options:");
    console.log(fullConfig);

    writeEnvFile(envObject);

    const stackMapping: { [key: string]: string } = {
      "S3:Pinecone": "S3PineconeCDKStack",
      "S3:MongoDB": "S3MongoDBCDKStack",
      "S3:PostgreSQL": "S3PostgresCDKStack",
    };

    const stackKey = `${source.sourceConnector}:${destination.destinationConnector}`;
    const stackToDeploy = stackMapping[stackKey];

    if (!stackToDeploy) {
      console.error("No matching stack found for the selected options.");
      process.exit(1);
    }

    // Execute the deployment command for the selected stack
    try {
      execSync(`npx cdk deploy ${stackToDeploy} --require-approval never`, {
        stdio: "inherit",
      });
    } catch (error) {
      console.error("Deployment failed:", error);
      process.exit(1);
    }
  });

program
  .command("destroy")
  .description("Destroy the CDK stack.")
  .action(async () => {
    console.log(
      kleur
        .red()
        .bold("WARNING: This action is permanent and cannot be undone!")
    );

    const { stackToDestroy } = await inquirer.prompt([
      {
        type: "list",
        name: "stackToDestroy",
        message: "Select the stack you wish to destroy:",
        choices: [
          "S3PineconeCDKStack",
          "S3MongoDBCDKStack",
          "S3PostgresCDKStack",
          new inquirer.Separator(),
          "Cancel",
        ],
      },
    ]);

    if (stackToDestroy === "Cancel") {
      console.log(kleur.yellow("Operation cancelled. Returning to CLI."));
      return;
    }

    try {
      execSync(
        `npx cdk destroy ${stackToDestroy} --require-approval never --force`,
        { stdio: "inherit" }
      );
    } catch (error) {
      console.error("Destruction failed:", error);
      process.exit(1);
    }
  });

program.parse(process.argv);

// Helper function to write answers to .env file
function writeEnvFile(envObject: Record<string, string>) {
  const envFilePath = path.resolve(process.cwd(), ".env");
  const envData = Object.entries(envObject)
    .map(([key, value]) => `${key.toUpperCase()}=${value}`)
    .join("\n");

  fs.writeFileSync(envFilePath, envData);
  console.log(
    kleur.green(".env file created/updated with your configurations.")
  );
}
