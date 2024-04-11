import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { aws_elasticloadbalancingv2_targets as elasticloadbalancingv2_targets } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class DemoStack extends cdk.Stack {
  /**
  * @brief This is the constructor for the DemoStack class, creates 2 new instances of ec2, with load balancer
  * @param scope The parent construct of this stack
  * @param id The ID of this stack
  * @param props The stack properties
  * @return A new instance of the DemoStack class
  */
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const httpPort = 80
    const defaultVpc = ec2.Vpc.fromLookup(this, 'VPC', { isDefault: true })
    const instanceRole = new iam.Role(
      this,
      'InstanceRole',
      { assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com') }
    )

    const instanceSecurityGroup = new ec2.SecurityGroup(
      this,
      'InstanceSecurityGroup',
      {
        vpc: defaultVpc,
        allowAllOutbound: true,
        securityGroupName: 'InstanceSecurityGroup',
      }
    )

    const instanceOne = new ec2.Instance(this, 'InstanceOne', {
      vpc: defaultVpc,
      role: instanceRole,
      securityGroup: instanceSecurityGroup,
      instanceName: 'InstanceOne',
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2()
    })

    const instanceTwo = new ec2.Instance(this, 'InstanceTwo', {
      vpc: defaultVpc,
      role: instanceRole,
      securityGroup: instanceSecurityGroup,
      instanceName: 'InstanceTwo',
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2()
    })

    const loadBalancerSecurityGroup = new ec2.SecurityGroup(
      this,
      'LoadBalancerSecurityGroup',
      {
        vpc: defaultVpc,
        allowAllOutbound: true,
        securityGroupName: 'InstanceSecurityGroup',
      }
    )

    loadBalancerSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(httpPort),
      'Allows HTTP access from Internet'
    )

    instanceSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(loadBalancerSecurityGroup.securityGroupId),
      ec2.Port.tcp(httpPort),
      'Allows HTTP access from Load Balancer'
    )

    const loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
      vpc: defaultVpc,
      internetFacing: true
    })

    const listener = loadBalancer.addListener('Listener', { port: httpPort })
    listener.addTargets('Instances', {
      targets: [new elasticloadbalancingv2_targets.InstanceIdTarget(instanceOne.instanceId, httpPort), new elasticloadbalancingv2_targets.InstanceIdTarget(instanceTwo.instanceId, httpPort)],
      port: httpPort,
      healthCheck: {
        port: httpPort.toString(),
      }
    })

    new cdk.CfnOutput(this, 'LoadBalancerDnsName', {
      value: loadBalancer.loadBalancerDnsName
    })
  }
}
