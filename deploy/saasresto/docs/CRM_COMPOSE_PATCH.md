# =============================================================================
# CRM Docker Compose Patch for SAASRESTO Integration
# /opt/crm/docker-compose.yml
# =============================================================================
# This file shows the MINIMAL changes needed to integrate SAASRESTO
# with the existing CRM nginx container.
#
# DO NOT replace your entire docker-compose.yml - only add these sections.
# =============================================================================

# -----------------------------------------------------------------------------
# BEFORE: Your existing CRM docker-compose.yml might look like this:
# -----------------------------------------------------------------------------
#
# version: "3.8"
# services:
#   nginx:
#     image: nginx:alpine
#     container_name: crm-nginx
#     ports:
#       - "80:80"
#       - "443:443"
#     volumes:
#       - ./nginx/conf.d:/etc/nginx/conf.d:ro
#       - ./certbot/www:/var/www/certbot:ro
#       - ./certbot/conf:/etc/letsencrypt:ro
#     restart: unless-stopped
#
#   crm-app:
#     # ... your CRM app config
#
# -----------------------------------------------------------------------------
# AFTER: Add these sections to your existing file:
# -----------------------------------------------------------------------------

version: "3.8"

services:
  nginx:
    image: nginx:alpine
    container_name: crm-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      # Existing volumes (keep as-is)
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./certbot/www:/var/www/certbot:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      
      # =========================================================
      # ADD THESE TWO LINES FOR SAASRESTO:
      # =========================================================
      # SAASRESTO vhost configuration
      - /opt/saasresto/nginx/conf.d/saasresto.conf:/etc/nginx/conf.d/saasresto.conf:ro
      # SAASRESTO SSL certificates
      - /opt/saasresto/certs/live:/etc/nginx/ssl/saasresto:ro
      # =========================================================
      
    networks:
      - default
      # =========================================================
      # ADD THIS LINE FOR SAASRESTO:
      # =========================================================
      - edge
      # =========================================================
    restart: unless-stopped

  # ... rest of your services remain unchanged ...

# =========================================================
# ADD THIS SECTION AT THE BOTTOM FOR SAASRESTO:
# =========================================================
networks:
  edge:
    external: true
# =========================================================


# =============================================================================
# STEP-BY-STEP INSTRUCTIONS
# =============================================================================
#
# 1. Create the edge network (run once):
#    docker network create edge
#
# 2. Edit /opt/crm/docker-compose.yml and add:
#    a) Under nginx service volumes, add:
#       - /opt/saasresto/nginx/conf.d/saasresto.conf:/etc/nginx/conf.d/saasresto.conf:ro
#       - /opt/saasresto/certs/live:/etc/nginx/ssl/saasresto:ro
#    
#    b) Under nginx service, add networks section:
#       networks:
#         - default
#         - edge
#    
#    c) At the bottom, add:
#       networks:
#         edge:
#           external: true
#
# 3. Restart nginx:
#    cd /opt/crm
#    docker compose up -d nginx
#
# 4. Verify nginx config:
#    docker exec crm-nginx nginx -t
#
# =============================================================================
