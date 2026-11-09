###############################################################################
# Security groups — chained exactly like the diagram legend:
#   public ALB -> web (Next.js) -> internal ALB -> app (NestJS) -> RDS
#
# The ALBs that use the two ALB groups are in modules/alb.
#
# Uses the standalone aws_vpc_security_group_*_rule resources so groups can
# reference each other without dependency cycles.
#
# Note: traffic to the Amazon DNS resolver (VPC+2) and the time service
# (169.254.169.123) is not filtered by security groups, so no DNS/NTP rules.
###############################################################################

resource "aws_security_group" "alb_public" {
  name        = "${var.name}-sg-alb-public"
  description = "Public ALB - HTTP from CloudFront"
  vpc_id      = aws_vpc.this.id
  tags        = { Name = "${var.name}-sg-alb-public" }
}

resource "aws_security_group" "web" {
  name        = "${var.name}-sg-web"
  description = "Next.js instances"
  vpc_id      = aws_vpc.this.id
  tags        = { Name = "${var.name}-sg-web" }
}

resource "aws_security_group" "alb_internal" {
  name        = "${var.name}-sg-alb-internal"
  description = "Internal ALB - API calls from web tier"
  vpc_id      = aws_vpc.this.id
  tags        = { Name = "${var.name}-sg-alb-internal" }
}

resource "aws_security_group" "app" {
  name        = "${var.name}-sg-app"
  description = "NestJS instances"
  vpc_id      = aws_vpc.this.id
  tags        = { Name = "${var.name}-sg-app" }
}

resource "aws_security_group" "db" {
  name        = "${var.name}-sg-db"
  description = "RDS PostgreSQL - only from app tier"
  vpc_id      = aws_vpc.this.id
  tags        = { Name = "${var.name}-sg-db" }
}

# ---------------------------------------------------------------------------
# Public ALB
# ---------------------------------------------------------------------------
# AWS-managed list of CloudFront origin-facing IPs. It counts as ~55 rules
# toward the 60-rule SG quota, so only ONE rule may use it.
data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

resource "aws_vpc_security_group_ingress_rule" "alb_public_from_cloudfront" {
  count             = var.restrict_alb_to_cloudfront ? 1 : 0
  security_group_id = aws_security_group.alb_public.id
  description       = "HTTP from CloudFront only"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
  prefix_list_id    = data.aws_ec2_managed_prefix_list.cloudfront.id
}

# Dev-only escape hatch: hit the ALB directly before CloudFront exists
resource "aws_vpc_security_group_ingress_rule" "alb_public_from_anywhere" {
  count             = var.restrict_alb_to_cloudfront ? 0 : 1
  security_group_id = aws_security_group.alb_public.id
  description       = "HTTP from anywhere (DEV ONLY)"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_egress_rule" "alb_public_to_web" {
  security_group_id            = aws_security_group.alb_public.id
  description                  = "Forward to Next.js"
  ip_protocol                  = "tcp"
  from_port                    = var.web_port
  to_port                      = var.web_port
  referenced_security_group_id = aws_security_group.web.id
}

# ---------------------------------------------------------------------------
# Web tier (Next.js)
# ---------------------------------------------------------------------------
resource "aws_vpc_security_group_ingress_rule" "web_from_alb_public" {
  security_group_id            = aws_security_group.web.id
  description                  = "From public ALB"
  ip_protocol                  = "tcp"
  from_port                    = var.web_port
  to_port                      = var.web_port
  referenced_security_group_id = aws_security_group.alb_public.id
}

resource "aws_vpc_security_group_egress_rule" "web_to_alb_internal" {
  security_group_id            = aws_security_group.web.id
  description                  = "API calls to internal ALB"
  ip_protocol                  = "tcp"
  from_port                    = 80
  to_port                      = 80
  referenced_security_group_id = aws_security_group.alb_internal.id
}

resource "aws_vpc_security_group_egress_rule" "web_https_out" {
  security_group_id = aws_security_group.web.id
  description       = "HTTPS out via NAT (SSM, dnf, npm)"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
  cidr_ipv4         = "0.0.0.0/0"
}

# ---------------------------------------------------------------------------
# Internal ALB
# ---------------------------------------------------------------------------
resource "aws_vpc_security_group_ingress_rule" "alb_internal_from_web" {
  security_group_id            = aws_security_group.alb_internal.id
  description                  = "From Next.js"
  ip_protocol                  = "tcp"
  from_port                    = 80
  to_port                      = 80
  referenced_security_group_id = aws_security_group.web.id
}

resource "aws_vpc_security_group_egress_rule" "alb_internal_to_app" {
  security_group_id            = aws_security_group.alb_internal.id
  description                  = "Forward to NestJS"
  ip_protocol                  = "tcp"
  from_port                    = var.app_port
  to_port                      = var.app_port
  referenced_security_group_id = aws_security_group.app.id
}

# ---------------------------------------------------------------------------
# App tier (NestJS)
# ---------------------------------------------------------------------------
resource "aws_vpc_security_group_ingress_rule" "app_from_alb_internal" {
  security_group_id            = aws_security_group.app.id
  description                  = "From internal ALB"
  ip_protocol                  = "tcp"
  from_port                    = var.app_port
  to_port                      = var.app_port
  referenced_security_group_id = aws_security_group.alb_internal.id
}

resource "aws_vpc_security_group_egress_rule" "app_to_db" {
  security_group_id            = aws_security_group.app.id
  description                  = "PostgreSQL"
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  referenced_security_group_id = aws_security_group.db.id
}

resource "aws_vpc_security_group_egress_rule" "app_https_out" {
  security_group_id = aws_security_group.app.id
  description       = "HTTPS out (S3 endpoint, Secrets Manager, SSM, dnf, npm)"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
  cidr_ipv4         = "0.0.0.0/0"
}

# ---------------------------------------------------------------------------
# Database — ingress from app only, no egress rules at all
# ---------------------------------------------------------------------------
resource "aws_vpc_security_group_ingress_rule" "db_from_app" {
  security_group_id            = aws_security_group.db.id
  description                  = "PostgreSQL from NestJS"
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  referenced_security_group_id = aws_security_group.app.id
}
