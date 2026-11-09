###############################################################################
# Instance profile for Session Manager (no SSH, no bastion) + CloudWatch agent.
#
# AWS Academy Learner Lab can't create IAM roles: set
#   existing_instance_profile_name = "LabInstanceProfile"
# and this file creates nothing.
###############################################################################

locals {
  create_iam            = var.existing_instance_profile_name == null
  instance_profile_name = local.create_iam ? aws_iam_instance_profile.ec2[0].name : var.existing_instance_profile_name
}

data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ec2" {
  count              = local.create_iam ? 1 : 0
  name               = "${var.name}-ec2-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

resource "aws_iam_role_policy_attachment" "ssm" {
  count      = local.create_iam ? 1 : 0
  role       = aws_iam_role.ec2[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "cloudwatch" {
  count      = local.create_iam ? 1 : 0
  role       = aws_iam_role.ec2[0].name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_instance_profile" "ec2" {
  count = local.create_iam ? 1 : 0
  name  = "${var.name}-ec2-profile"
  role  = aws_iam_role.ec2[0].name
}

# TODO (later steps): separate roles for web vs app, and give ONLY the app role
# read access to its Secrets Manager secrets and the S3 bucket.
