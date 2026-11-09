###############################################################################
# ALB module — the two load balancers from the diagram:
#   public:   CloudFront -> public ALB   -> Next.js ASG (nodes in public subnets)
#   internal: Next.js    -> internal ALB -> NestJS ASG  (nodes in app subnets)
#
# Each load balancer is made of three resources:
#   aws_lb               the load balancer itself, with a node in each AZ
#   aws_lb_listener      the port it accepts traffic on, and where to send it
#   aws_lb_target_group  the pool of instances, and how to health-check them
#
# Instances join a target group through their ASG (target_group_arns in the
# compute module), so new instances are registered automatically.
###############################################################################

locals {
  albs = {
    public = {
      internal    = false
      subnet_ids  = var.public_subnet_ids
      sg_id       = var.public_alb_sg_id
      tier        = "web"
      target_port = var.web_port
      health_path = "/healthz" # app/frontend/src/app/healthz/route.ts
    }
    internal = {
      internal    = true
      subnet_ids  = var.app_subnet_ids
      sg_id       = var.internal_alb_sg_id
      tier        = "app"
      target_port = var.app_port
      health_path = "/health" # app/backend/src/health/health.controller.ts
    }
  }
}

# ---------------------------------------------------------------------------
# Load balancers. Without them nothing can reach the private instances.
# ---------------------------------------------------------------------------
resource "aws_lb" "this" {
  for_each = local.albs

  name               = "${var.name}-alb-${each.key}"
  load_balancer_type = "application"
  internal           = each.value.internal
  subnets            = each.value.subnet_ids
  security_groups    = [each.value.sg_id]

  # Reject malformed HTTP headers instead of forwarding them to the instances
  drop_invalid_header_fields = true

  # Off on purpose: the stack is destroyed at the end of every lab session
  enable_deletion_protection = false

  tags = { Name = "${var.name}-alb-${each.key}" }
}

# ---------------------------------------------------------------------------
# Target groups. Without them a listener has nowhere to forward traffic.
# ---------------------------------------------------------------------------
resource "aws_lb_target_group" "this" {
  for_each = local.albs

  # The port is in the name so create_before_destroy works when it changes:
  # a target group in use can't be deleted first, and names must be unique.
  name        = "${var.name}-tg-${each.value.tier}-${each.value.target_port}"
  vpc_id      = var.vpc_id
  target_type = "instance"
  protocol    = "HTTP"
  port        = each.value.target_port

  # Default is 300 s. 30 s keeps rolling updates and destroys quick.
  deregistration_delay = 30

  health_check {
    protocol            = "HTTP"
    port                = "traffic-port"
    path                = each.value.health_path
    matcher             = "200"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = { Name = "${var.name}-tg-${each.value.tier}" }

  lifecycle {
    create_before_destroy = true
  }
}

# ---------------------------------------------------------------------------
# Listeners. Without them the load balancer refuses every connection.
#
# Trade-off: HTTP on both. CloudFront terminates HTTPS for browsers, so the
# CloudFront -> ALB hop is unencrypted. HTTPS here would need a custom domain
# and an ACM certificate on the ALB.
# ---------------------------------------------------------------------------
resource "aws_lb_listener" "http" {
  for_each = local.albs

  load_balancer_arn = aws_lb.this[each.key].arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.this[each.key].arn
  }

  tags = { Name = "${var.name}-listener-${each.key}" }
}
