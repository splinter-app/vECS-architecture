import inquirer from "inquirer";
import { envType } from "./envType";

export async function askSourceQuestions(envObject: envType) {
  const source = await inquirer.prompt([
    {
      type: "list",
      name: "sourceConnector",
      message: "Choose your source connector:",
      choices: ["S3", "Google Drive", "Dropbox"],
    },
  ]);

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
    Object.assign(envObject, { s3_bucket_name: s3BucketName });

    const { s3NotificationPrefix } = await inquirer.prompt([
      {
        type: "input",
        name: "s3NotificationPrefix",
        message: "Enter the name of the S3 bucket folder (optional):",
      },
    ]);
    
    const prefix = s3NotificationPrefix.trim() ? `${s3NotificationPrefix.trim()}/` : '';
    Object.assign(envObject, { s3_notification_prefix: prefix });
  }

  return source;
}
