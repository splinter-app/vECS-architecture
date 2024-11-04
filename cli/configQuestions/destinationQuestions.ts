import inquirer from "inquirer";
import { envType } from "./envType";

import kleur = require("kleur");

function displayPostgresInstructions(postgresTableName: string) {
  const sqlCode = `
SQL Code to Create the Table:
The default table name is "elements". If you selected a different table name, please confirm the SQL code before running.
If you do not already have a table created with the correct schema, you can execute the following SQL code:

-- Step 1: Create the vector extension (if not already created)
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Drop the existing elements table (if necessary)
DROP TABLE IF EXISTS elements;

-- Step 3: Create the new table with the required schema
CREATE TABLE ${postgresTableName} (
    id UUID PRIMARY KEY,
    element_id VARCHAR,
    text TEXT,
    embeddings VECTOR(768),
    type VARCHAR,
    system VARCHAR,
    layout_width INTEGER,
    layout_height INTEGER,
    points JSONB,
    url VARCHAR,
    version VARCHAR,
    date_created TIMESTAMP,
    date_modified TIMESTAMP,
    date_processed TIMESTAMP,
    permissions_data JSONB,
    record_locator JSONB,
    category_depth INTEGER,
    parent_id UUID,
    attached_filename VARCHAR,
    filetype VARCHAR,
    last_modified TIMESTAMP,
    file_directory VARCHAR,
    filename VARCHAR,
    languages VARCHAR,
    page_number INTEGER,
    links TEXT[],
    page_name VARCHAR,
    link_urls TEXT[],
    link_texts TEXT[],
    sent_from VARCHAR,
    sent_to VARCHAR,
    subject VARCHAR,
    section VARCHAR,
    header_footer_type VARCHAR,
    emphasized_text_contents TEXT,
    emphasized_text_tags TEXT[],
    text_as_html TEXT,
    regex_metadata TEXT[],
    detection_class_prob FLOAT
);
  `;

  console.log(kleur.yellow("Please ensure that your table has the correct schema definition."));
  console.log(kleur.blue(sqlCode));
}


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

        type: "password",
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


  if (destination.destinationConnector === "PostgreSQL") {
    const { postgres_host } = await inquirer.prompt([
      {
        type: "input",
        name: "postgres_host",
        message: "Enter PostgreSQL Host:",
        validate: (input) => input.trim() !== "" || "Host cannot be empty.",
      },
    ]);
    const { postgres_port } = await inquirer.prompt([
      {
        type: "input",
        name: "postgres_port",
        message: "Enter PostgreSQL Port (default is 5432):",
        default: "5432",
        validate: (input) => {
          const port = input.trim();
          return port === '' || !isNaN(Number(port)) ? true : "Port must be a number.";
        },
      },
    ]);
    const { postgres_user } = await inquirer.prompt([
      {
        type: "input",
        name: "postgres_user",
        message: "Enter PostgreSQL Username:",
        validate: (input) =>
          input.trim() !== "" || "Username cannot be empty.",
      },
    ]);
    const { postgres_password } = await inquirer.prompt([
      {
        type: "password",
        name: "postgres_password",
        message: "Enter PostgreSQL Password:",
        validate: (input) =>
          input.trim() !== "" || "Password cannot be empty.",
      },
    ]);
    const { postgres_db_name } = await inquirer.prompt([
      {
        type: "input",
        name: "postgres_db_name",
        message: "Enter PostgreSQL Database Name:",
        validate: (input) =>
          input.trim() !== "" || "Database Name cannot be empty.",
      },
    ]);
    const { postgres_table_name } = await inquirer.prompt([
      {
        type: "input",
        name: "postgres_table_name",
        message: "Enter PostgreSQL Table Name (default is 'elements'):",
        default: "elements",
        validate: (input) =>
          input.trim() !== "" || "Table Name cannot be empty.",
      },
    ]);
    Object.assign(envObject, {
      postgres_host,
      postgres_port,
      postgres_user,
      postgres_password,
      postgres_db_name,
      postgres_table_name
    });

    displayPostgresInstructions(postgres_table_name);
  }

  return destination;
}
