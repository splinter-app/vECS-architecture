import inquirer from "inquirer";

export async function askAWSQuestions() {
  const { my_aws_access_key_id } = await inquirer.prompt([
    {
      type: "input",
      name: "my_aws_access_key_id",
      message: "Enter AWS Access Key ID:",
      validate: (input) => input.trim() !== "" || "Access key cannot be empty.",
    },
  ]);
  const { my_aws_secret_access_key } = await inquirer.prompt([
    {
      type: "input",
      name: "my_aws_secret_access_key",
      message: "Enter AWS Secret Access Key:",
      validate: (input) => input.trim() !== "" || "Access key cannot be empty.",
    },
  ]);

  return { my_aws_access_key_id, my_aws_secret_access_key };
}
