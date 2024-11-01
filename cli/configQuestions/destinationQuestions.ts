import inquirer from "inquirer";
import { envType } from "./envType";

export async function askDestinationQuestions(envObject: envType) {
  const destination = await inquirer.prompt([
    {
      type: "list",
      name: "destinationConnector",
      message: "Choose your destination connector:",
      choices: ["Pinecone", "MongoDB", "PostgreSQL"],
    },
  ]);

  if (destination.destinationConnector === "Pinecone") {
    const { pineconeAPIKey } = await inquirer.prompt([
      {
        type: "input",
        name: "pineconeAPIKey",
        message: "Enter Pinecone API Key:",
        validate: (input) => input.trim() !== "" || "API Key cannot be empty.",
      },
    ]);
    const { pineconeIndexName } = await inquirer.prompt([
      {
        type: "input",
        name: "pineconeIndexName",
        message: "Enter the name of the Pinecone index:",
        validate: (input) =>
          input.trim() !== "" || "Index name cannot be empty.",
      },
    ]);
    Object.assign(envObject, {
      pinecone_api_key: pineconeAPIKey,
      pinecone_index_name: pineconeIndexName,
    });
  }

  if (destination.destinationConnector === "MongoDB") {
    const { mongodb_uri } = await inquirer.prompt([
      {
        type: "input",
        name: "mongodb_uri",
        message: "Enter MongoDB URI:",
        validate: (input) => input.trim() !== "" || "URI cannot be empty.",
      },
    ]);
    const { mongodb_database } = await inquirer.prompt([
      {
        type: "input",
        name: "mongodb_database",
        message: "Enter MongoDB Database:",
        validate: (input) =>
          input.trim() !== "" || "Database name cannot be empty.",
      },
    ]);
    const { mongodb_collection } = await inquirer.prompt([
      {
        type: "input",
        name: "mongodb_collection",
        message: "Enter MongoDB Collection:",
        validate: (input) =>
          input.trim() !== "" || "Collection name cannot be empty.",
      },
    ]);
    Object.assign(envObject, {
      mongodb_uri,
      mongodb_database,
      mongodb_collection,
    });
  }

  return destination;
}
