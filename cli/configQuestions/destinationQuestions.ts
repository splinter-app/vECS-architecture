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

  return destination;
}
