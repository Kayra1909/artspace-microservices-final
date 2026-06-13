# Custom Postgres image that bakes the per-service DB init script into a real
# image layer. Bind-mounting init-db.sh from the host fails on Docker Desktop
# for macOS: the file-share reports it executable but the mount is noexec, so
# Postgres' entrypoint tries to exec it and the kernel reports
# "/bin/bash: bad interpreter: Permission denied", aborting first-time init.
# COPYing it in (with a proper exec bit) sidesteps host file-sharing entirely.
FROM postgres:18
COPY init-db.sh /docker-entrypoint-initdb.d/init-db.sh
RUN chmod +x /docker-entrypoint-initdb.d/init-db.sh
