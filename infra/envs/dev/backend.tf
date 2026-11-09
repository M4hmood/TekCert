# Shared remote state so all 4 teammates work on the same infrastructure.
# The bucket must exist BEFORE `terraform init` — see README step 1.
# use_lockfile = native S3 locking (Terraform >= 1.10), no DynamoDB table needed.
terraform {
  backend "s3" {
    bucket       = "tekcert-tfstate-mahmoud" # must be globally unique
    key          = "dev/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
