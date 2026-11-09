###############################################################################
# Network module — VPC 10.0.0.0/24 across 2 AZs, 4 tiers (see AWS-Architecture-V1)
#
#   Tier     AZ a            AZ b            Internet access
#   public   10.0.0.0/27     10.0.0.32/27    IGW (in + out)   -> ALB nodes, NAT
#   web      10.0.0.64/27    10.0.0.96/27    NAT (out only)   -> Next.js EC2
#   app      10.0.0.128/27   10.0.0.160/27   NAT (out only)   -> NestJS EC2, internal ALB
#   data     10.0.0.192/27   10.0.0.224/27   none             -> RDS
###############################################################################

locals {
  # cidrsubnet(vpc_cidr, 3, n) splits the /24 into eight /27s: n = 0..7
  subnets = {
    public-a = { tier = "public", az = var.azs[0], index = 0 }
    public-b = { tier = "public", az = var.azs[1], index = 1 }
    web-a    = { tier = "web", az = var.azs[0], index = 2 }
    web-b    = { tier = "web", az = var.azs[1], index = 3 }
    app-a    = { tier = "app", az = var.azs[0], index = 4 }
    app-b    = { tier = "app", az = var.azs[1], index = 5 }
    data-a   = { tier = "data", az = var.azs[0], index = 6 }
    data-b   = { tier = "data", az = var.azs[1], index = 7 }
  }

  subnet_ids_by_tier = {
    for tier in ["public", "web", "app", "data"] :
    tier => [for k, s in local.subnets : aws_subnet.this[k].id if s.tier == tier]
  }
}

# ---------------------------------------------------------------------------
# VPC + Internet Gateway
# ---------------------------------------------------------------------------
resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true # required for SSM / interface endpoints / RDS endpoints

  tags = { Name = "${var.name}-vpc" }
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
  tags   = { Name = "${var.name}-igw" }
}

# ---------------------------------------------------------------------------
# Subnets — nothing gets a public IP automatically, not even in public subnets
# (only the ALB and the NAT live there, and they bring their own addresses)
# ---------------------------------------------------------------------------
resource "aws_subnet" "this" {
  for_each = local.subnets

  vpc_id                  = aws_vpc.this.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 3, each.value.index)
  availability_zone       = each.value.az
  map_public_ip_on_launch = false

  tags = {
    Name = "${var.name}-${each.key}"
    Tier = each.value.tier
  }
}

# ---------------------------------------------------------------------------
# NAT Gateway — single NAT in AZ a (cost choice from the diagram).
# Set enable_nat_gateway = false between work sessions to stop the ~$1/day bill.
# WARNING: without NAT, private instances lose outbound internet AND Session Manager.
# ---------------------------------------------------------------------------
resource "aws_eip" "nat" {
  count  = var.enable_nat_gateway ? 1 : 0
  domain = "vpc"
  tags   = { Name = "${var.name}-nat-eip" }
}

resource "aws_nat_gateway" "this" {
  count         = var.enable_nat_gateway ? 1 : 0
  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.this["public-a"].id
  tags          = { Name = "${var.name}-nat" }

  depends_on = [aws_internet_gateway.this]
}

# ---------------------------------------------------------------------------
# Route tables
#   public  -> 0.0.0.0/0 via IGW
#   private -> 0.0.0.0/0 via NAT (web + app, both AZs share the single NAT)
#   data    -> local only, no internet route at all
# ---------------------------------------------------------------------------
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id
  tags   = { Name = "${var.name}-rt-public" }
}

resource "aws_route" "public_internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.this.id
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.this.id
  tags   = { Name = "${var.name}-rt-private" }
}

resource "aws_route" "private_nat" {
  count                  = var.enable_nat_gateway ? 1 : 0
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.this[0].id
}

resource "aws_route_table" "data" {
  vpc_id = aws_vpc.this.id
  tags   = { Name = "${var.name}-rt-data" }
}

locals {
  route_table_for_tier = {
    public = aws_route_table.public.id
    web    = aws_route_table.private.id
    app    = aws_route_table.private.id
    data   = aws_route_table.data.id
  }
}

resource "aws_route_table_association" "this" {
  for_each = local.subnets

  subnet_id      = aws_subnet.this[each.key].id
  route_table_id = local.route_table_for_tier[each.value.tier]
}

# ---------------------------------------------------------------------------
# S3 Gateway endpoint (free) — app tier reaches the private bucket without NAT
# ---------------------------------------------------------------------------
data "aws_region" "current" {}

resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.this.id
  service_name      = "com.amazonaws.${data.aws_region.current.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.private.id]

  tags = { Name = "${var.name}-vpce-s3" }
}
