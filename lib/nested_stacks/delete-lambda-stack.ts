import * as cdk from "aws-cdk-lib";
import { NestedStack, NestedStackProps } from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface DeleteLambdaStackProps extends NestedStackProps {
  lambdaExecutionRoleArn: string;
  lambdaAssetPath: string;
  environment: { [key: string]: string };
}

export class DeleteLambdaStack extends NestedStack {
  public deleteLambda: lambda.Function

  constructor(scope: Construct, id: string, props: DeleteLambdaStackProps) {
    super(scope, id, props);

    const { lambdaExecutionRoleArn, lambdaAssetPath, environment } = props;

    // Create a role from the ARN
    const lambdaExecutionRole = iam.Role.fromRoleArn(this, 'ImportedLambdaExecutionRole', lambdaExecutionRoleArn);

    // Define the Lambda function for handling S3 object deletion
    this.deleteLambda = new lambda.Function(this, "DeleteLambdaFunction", {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: "delete_lambda_function.lambda_handler",
      code: lambda.Code.fromAsset(lambdaAssetPath),
      role: lambdaExecutionRole,
      environment: environment,
      timeout: cdk.Duration.seconds(30),
    });

    // deleteLambda.addToRolePolicy(
    //   new iam.PolicyStatement({
    //     actions: ["batch:SubmitJob"],
    //     resources: [props.jobQueueArn],
    //   })
    // );

  }
}
