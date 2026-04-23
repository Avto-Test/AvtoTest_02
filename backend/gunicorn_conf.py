import multiprocessing

# Gunicorn setup for FastAPI with Uvicorn
# Optimized for a 1GB RAM constraint

# Address and Port
bind = "0.0.0.0:8000"

# Workers
# 1-2 workers max for 1GB RAM to avoid memory issues
# Use Uvicorn's worker class for ASGI apps
workers = 2
worker_class = "uvicorn.workers.UvicornWorker"

# Timeout settings
# Prevents stuck workers from consuming memory forever
timeout = 60
keepalive = 5

# Memory Leak Prevention
# Automatically restart workers after processing a certain number of requests
# Jitter prevents all workers from restarting at the exact same time
max_requests = 1000
max_requests_jitter = 50

# Logging Options
loglevel = "info"
accesslog = "-"
errorlog = "-"
