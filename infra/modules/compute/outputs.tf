output "asg_names" {
  value = { for k, asg in aws_autoscaling_group.this : k => asg.name }
}

output "launch_template_ids" {
  value = { for k, lt in aws_launch_template.this : k => lt.id }
}

output "instance_profile_name" {
  value = local.instance_profile_name
}
