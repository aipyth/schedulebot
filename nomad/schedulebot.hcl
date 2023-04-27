variable "docker_auth_login" {
  type = string
  description = "This variable is used as a docker login to container registry."
  default = "baltazar1697"
}
variable "docker_auth_password" {
  type = string
  description = "This variable is used as a docker password to container registry"
}
job "schedulebot" {
  datacenters=["aws1"]
  type = "service"
  meta {
    run_uuid = "${uuidv4()}"
  }

  group "redis" {
    count = 1
    network {
      port "redis" {
        to = 6379
      }
    }
    volume "schedulebot-redis" {
      type      = "host"
      read_only = false
      source    = "schedulebot-redis"
    }
    task "redis-task" {
      driver = "docker"
      volume_mount {
        volume      = "schedulebot-redis"
        destination = "/data"
        read_only   = false
      }     
      service {
      provider = "nomad"
      name     = "redis"
      port     = "redis"
      check {
        name     = "redis_probe"
        type     = "tcp"
        interval = "10s"
        timeout  = "1s"
      }
    }
      config {
        image = "redis:7.0.7-alpine"
        ports = ["redis"]
        command = "redis-server"
        volumes = [
          "redis/redis.conf:/usr/local/etc/redis/redis.conf"
        ]
        args = [
          "/usr/local/etc/redis/redis.conf"
        ]
      }
      template {
        data = <<EOH
        appendonly no

        save 60 1
        dir /data

        maxmemory 100mb
        maxmemory-policy noeviction

        loglevel notice

        EOH
        destination = "redis/redis.conf"
        change_mode = "noop"
      }
    }
  }
  group "bot" {
    count = 1
    task "bot" {
        driver = "docker"
      env {
        SCHEDULE_FILE_PATH = "/configuration/schedule.yml"
      }
      service {
        name = "schedulebot"
        provider = "nomad"
      }

      template {
          data = <<EOH
          REDIS_HOST="{{ range nomadService "redis" }}{{ .Address }}{{ end }}"
          REDIS_PORT="{{ range nomadService "redis" }}{{ .Port }}{{ end }}"
          BOT_TOKEN="{{ with nomadVar "nomad/jobs/schedulebot" }}{{ .BOT_TOKEN }}{{ end }}"
          EOH
          destination = "${NOMAD_SECRETS_DIR}/bot.env"
          env         = true
      }
      config {
        image = "registry.gitlab.com/m11259/schedulebot:latest"
        auth {
          username = var.docker_auth_login
          password = var.docker_auth_password
      }
      }
    }
  }
}
