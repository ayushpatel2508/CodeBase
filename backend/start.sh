#!/bin/bash

# Start the rq worker in the background
rq worker -u $REDIS_URL &

# Start the gunicorn web server in the foreground
gunicorn app.main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
