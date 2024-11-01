#!/usr/bin/env node

import { Command } from "commander";
import inquirer from "inquirer";
import { execSync } from "child_process";
import kleur = require("kleur");
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
    // Initial questions
    const source = await inquirer.prompt([
      {
        type: "list",
        name: "sourceConnector",
        message: "Choose your source connector:",
        choices: ["S3", "Google Drive", "Dropbox"],
      },
    ]);

    // Ask for S3 bucket name if the source connector is S3
    if (source.sourceConnector === "S3") {
      const { s3BucketName } = await inquirer.prompt([
        {
          type: "input",
          name: "s3BucketName",
          message: "Enter the name of the S3 bucket:",
          validate: (input) =>
            input.trim() !== "" || "S3 bucket name cannot be empty.",
        },
      ]);
    }

    const destination = await inquirer.prompt([
      {
        type: "list",
        name: "destinationConnector",
        message: "Choose your destination connector:",
        choices: ["Pinecone", "MongoDB", "PostgreSQL"],
      },
    ]);

    if (destination.destinationConnector === "Pinecone") {
      const { pineconeIndexName } = await inquirer.prompt([
        {
          type: "input",
          name: "pineconeIndexName",
          message: "Enter the name of the Pinecone index:",
          validate: (input) =>
            input.trim() !== "" || "Index name cannot be empty.",
        },
      ]);
    }

    const embedding = await inquirer.prompt([
      {
        type: "list",
        name: "embeddingProvider",
        message: "Select an embedding provider:",
        choices: ["Huggingface", "OpenAI", "VoyageAI", "Bedrock"],
      },
    ]);

    if (embedding.embeddingProvider === "OpenAI") {
      const { embeddingModelName } = await inquirer.prompt([
        {
          type: "list",
          name: "embeddingModelName",
          message: "Select OpenAI embedding model:",
          choices: [
            "text-embedding-3-small",
            "text-embedding-3-large",
            "text-embedding-ada-002",
          ],
        },
      ]);
      const { openaiAPIKey } = await inquirer.prompt([
        {
          type: "input",
          name: "openaiAPIKey",
          message: "Enter your OpenAI API Key:",
          validate: (input) =>
            input.trim() !== "" || "API Key cannot be empty.",
        },
      ]);
    }

    // Continue with the remaining questions
    const additionalAnswers = await inquirer.prompt([
      {
        type: "list",
        name: "chunkStrategy",
        message: "Choose your chunking strategy:",
        choices: ["Basic", "By Title", "By Page", "By Similarity"],
      },
      {
        type: "list",
        name: "chunkSize",
        message: "Choose your chunk size:",
        choices: ["500", "1000", "1500", "2000"],
      },
    ]);

    // Merge answers
    const fullAnswers = {
      ...source,
      ...destination,
      ...embedding,
      ...additionalAnswers,
    };

    console.log("Deploying with the following options:");
    console.log(fullAnswers);

    // Execute the deployment command with error handling
    try {
      execSync("npx cdk deploy", { stdio: "inherit" });
    } catch (error) {
      console.error("Deployment failed:", error);
      process.exit(1);
    }
  });

program.parse(process.argv);
