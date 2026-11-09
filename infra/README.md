# TekCert — Infrastructure (Terraform)

Step 1 of the IaC rollout: **VPC + network internals + EC2 Auto Scaling groups**,
matching `AWS-Architecture-V1.drawio`. ALBs, RDS, CloudFront, S3 bucket and
Secrets Manager come in later steps.

```
modules/
  network/   VPC, 8 subnets, IGW, NAT, route tables, S3 gateway endpoint, 5 security groups
  compute/   IAM instance profile (SSM), launch templates, 2 ASGs (web, app)
envs/dev/    root module wiring it together
```

## What gets created

| Tier   | AZ a          | AZ b          | Route            | Contains          |
|--------|---------------|---------------|------------------|-------------------|
| public | 10.0.0.0/27   | 10.0.0.32/27  | IGW              | NAT (AZ a only), public ALB later |
| web    | 10.0.0.64/27  | 10.0.0.96/27  | NAT              | Next.js ASG       |
| app    | 10.0.0.128/27 | 10.0.0.160/27 | NAT + S3 endpoint| NestJS ASG, internal ALB later |
| data   | 10.0.0.192/27 | 10.0.0.224/27 | local only       | RDS later         |

Security group chain: public ALB → web → internal ALB → app → db.

## New to Terraform? Read this first

**The six ideas you need:**

| Concept    | What it is | Example in this repo |
|------------|-----------|----------------------|
| `provider` | The plugin that talks to AWS | `envs/dev/versions.tf` |
| `resource` | Something Terraform creates and owns | `aws_vpc.this` |
| `data`     | Something Terraform only *reads* (already exists) | latest AMI ID, CloudFront IP list |
| `variable` / `output` | A module's inputs and return values | `azs`, `web_subnet_ids` |
| `module`   | A folder of `.tf` files you call like a function | `module "network"` in `envs/dev/main.tf` |
| **state**  | Terraform's record of what it created → lives in S3 | `backend.tf` |

**The loop:** `plan` shows the diff between your code and reality → you read it → `apply` executes it. **Always read the plan.** A line that starts with `-/+` means *destroy and recreate*.

**Two constructs that look scary but aren't:**
- `for_each = local.subnets` — one block, one copy of the resource per map entry. Eight subnets, one `aws_subnet` block.
- `count = var.enable_nat_gateway ? 1 : 0` — the on/off switch for an optional resource. That's why you'll see `aws_nat_gateway.this[0]`.

**Reading order:** `envs/dev/main.tf` → `modules/network/main.tf` → `security_groups.tf` → `modules/compute/main.tf` → `iam.tf`.

**Do it in two applies the first time**, so you see each layer working on its own:

```bash
terraform apply -target=module.network   # VPC only; check it in the console
terraform apply                          # then the EC2s
```

(`-target` is a learning/emergency tool. Don't use it day to day.)

**Rules for a 4-person team:**
- Only one person runs `apply` at a time. The S3 lock protects the state, but teammates still need to talk to each other.
- Never change in the AWS console something Terraform manages. The next `plan` will try to undo it.
- Never commit `.tfstate` or `.tfvars` files (they're already in `.gitignore`).

## First-time setup (once, by one person)

1. Create the state bucket (name must be globally unique), then put its name in `envs/dev/backend.tf`:

   ```bash
   aws s3api create-bucket --bucket tekcert-tfstate-<yourname> --region us-east-1
   aws s3api put-bucket-versioning --bucket tekcert-tfstate-<yourname> \
     --versioning-configuration Status=Enabled
   aws s3api put-public-access-block --bucket tekcert-tfstate-<yourname> \
     --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
   ```

2. `cp envs/dev/terraform.tfvars.example envs/dev/terraform.tfvars`

## Everyday use

```bash
cd envs/dev
terraform init
terraform fmt -recursive ../.. && terraform validate
terraform plan -out=tfplan
terraform apply tfplan
```

## Verify it works

```bash
# Instances should show up as "Online" within ~3 minutes
aws ssm describe-instance-information --query "InstanceInformationList[].[InstanceId,PingStatus]"

# Shell into one (no SSH key, no bastion)
aws ssm start-session --target <instance-id>
curl localhost:3000     # placeholder page
```

## Saving money

- Between sessions: `enable_nat_gateway = false` → apply. Instances keep running
  but lose outbound internet and Session Manager.
- Or tear everything down: `terraform destroy`. The state bucket survives.
