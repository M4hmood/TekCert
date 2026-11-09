# CLAUDE.md — TekCert infrastructure

Terraform for **TekCert**, a semester group project at Tek-Up (ING-4-CIM). TekCert is a platform
that guides students toward the school's free certifications (AWS, Azure, Red Hat).
Stack: Next.js (EC2) → NestJS monolith (EC2) → PostgreSQL (RDS). The source of truth for the
architecture is `AWS-Architecture-V1.drawio` (in the claude.ai Project). If the code and the
diagram disagree, say so. Don't silently pick one.

## Who you're working with

- Team of 4 students. **This is their first time using Terraform.**
- They'll have to defend every line in front of a professor. So:
  - Briefly explain each new resource you add: what it is, why it's needed, and what breaks without it.
  - Prefer explicit, readable code over clever code. No community modules (e.g. `terraform-aws-modules/*`),
    because they hide what the team needs to learn.
  - When you make a design choice, state the trade-off in one line so they can put it in the report.
- Be direct. If an idea is weak, overcomplicated or insecure, say so.

## Environment: AWS Academy Learner Lab ⚠️

- **Cannot create IAM roles, users or policies.** Use the existing `LabInstanceProfile` / `LabRole`
  (`existing_instance_profile_name = "LabInstanceProfile"` in tfvars). Never add `aws_iam_*`
  resources without the `local.create_iam` guard.
- Region: **us-east-1** only.
- Credentials are short-lived (they expire when the lab session ends). `ExpiredToken` → the user must
  re-paste credentials from *AWS Details*. It's not a code bug.
- Limited lab budget. Exceeding it can wipe the account. NAT Gateway keeps billing even when the
  lab is stopped → `terraform destroy` at the end of every session.
- Each teammate usually has their **own** lab account. One account is the shared "infra account";
  only that one runs `apply`.

## Layout

```
modules/network/   VPC, 8 subnets, IGW, NAT, route tables, S3 gateway endpoint, security groups
modules/compute/   instance profile (optional), launch templates, ASGs web + app
envs/dev/          root module, S3 backend (use_lockfile), tfvars
```

## Architecture decisions (don't change without asking)

| Decision | Reason / trade-off |
|---|---|
| VPC `10.0.0.0/24` split into eight /27s via `cidrsubnet(cidr, 3, n)` | public .0/.32, web .64/.96, app .128/.160, data .192/.224 (AZ a/b) |
| Single NAT in AZ a | Cost. AZ b loses outbound traffic if AZ a fails. Inbound HA still works |
| Data subnets have **no** internet route | RDS must never reach or be reached from the internet |
| SG chain: public ALB → web → internal ALB → app → db | Groups reference each other, never CIDRs, between tiers |
| Egress restricted (443 out, specific ports between tiers); db SG has no egress | Least privilege |
| Session Manager only: no SSH, no key pairs, no bastion, no port 22 | Depends on NAT being on |
| IMDSv2 required, EBS encrypted, no public IPs on instances | Baseline hardening |
| Public ALB SG uses the CloudFront origin-facing prefix list (one rule only, it counts ~55 toward the quota) | `restrict_alb_to_cloudfront = false` only for dev before CloudFront exists |
| **Next.js calls the API server-side only** (route handlers / server actions) | The internal ALB isn't reachable from browsers |

## Status

- ✅ Network module, compute module (ASGs run a placeholder HTTP server on port 3000)
- ⏭️ Next steps, in order: public + internal ALB with target groups → RDS (Multi-AZ, data subnets,
  Secrets Manager password) → private S3 bucket → CloudFront + WAF + ACM → CloudWatch logs/alarms + SNS

## Commands

```bash
cd envs/dev
terraform fmt -recursive ../.. && terraform validate
terraform plan -out=tfplan
terraform apply tfplan
terraform destroy
```

## Rules for Claude

- **Never run `apply`, `destroy`, `import`, `state rm` or `force-unlock` yourself.** Write the code,
  run `fmt` / `validate` / `plan` if possible, show the plan summary, and let the user run the rest.
- Always run `terraform fmt -recursive` and `terraform validate` after editing `.tf` files.
- Never hardcode AMI IDs, account IDs, credentials or secrets. AMIs come from the SSM public parameter.
  Secrets go in Secrets Manager.
- Never commit `*.tfstate`, `*.tfvars` or `.terraform/`.
- Security group rules: use standalone `aws_vpc_security_group_ingress_rule` / `egress_rule`
  resources, not inline `ingress {}` blocks and not the legacy `aws_security_group_rule`.
- New resources: name them `"${var.name}-<thing>"`, tag only `Name` (the rest comes from
  `default_tags`), give every variable a `description`.
- `for_each` for collections, `count` only for on/off toggles.
- **Flag the monthly cost** of anything that bills by the hour (ALB, NAT, interface endpoints,
  RDS, extra instances) before adding it.
- Provider: `hashicorp/aws ~> 6.0`, Terraform `>= 1.10`.
- Code and comments in English. Report/deliverable text for the school is in French when asked.