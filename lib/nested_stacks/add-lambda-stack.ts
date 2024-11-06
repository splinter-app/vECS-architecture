import { NestedStack, NestedStackProps, Duration } from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { env } from "process";

interface AddLambdaStackProps extends NestedStackProps {
  jobQueueRef: string;
  jobDefinitionRef: string;
  lambdaAssetPath: string;
  environment: { [key: string]: string };
}

export class AddLambdaStack extends NestedStack {
  public addLambda: lambda.Function;
  public readonly lambdaExecutionRole: iam.IRole;
  public lambdaExecutionRoleArn: string;
  constructor(scope: Construct, id: string, props: AddLambdaStackProps) {
    super(scope, id, props);

    const { jobQueueRef, jobDefinitionRef, lambdaAssetPath, environment } = props;


    // Create a role for the Lambda functions
    const lambdaExecutionRole = new iam.Role(this, "LambdaExecutionRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });

    lambdaExecutionRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicExecutionRole"
      )
    );

    this.lambdaExecutionRole = lambdaExecutionRole;

    // Define the Lambda function for adding
    this.addLambda = new lambda.Function(this, "AddLambdaFunction", {
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromAsset(lambdaAssetPath),
      handler: "add_lambda_function.lambda_handler",
      role: lambdaExecutionRole,
      environment: environment,
      timeout: Duration.seconds(30),
    });

    // Grant permissions for the add Lambda to submit jobs to AWS Batch
    this.addLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["batch:SubmitJob"],
        resources: [jobQueueRef, jobDefinitionRef],
      })
    );

    this.lambdaExecutionRoleArn = lambdaExecutionRole.roleArn;

  }
}
