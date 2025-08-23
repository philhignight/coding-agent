#!/bin/bash

# Setup nginx for CCC

echo "Setting up nginx configuration for CCC..."

# Create nginx config
cat > /tmp/ccc-nginx.conf << 'EOF'
server {
    listen 5557;
    server_name dailyernest.com;

    # CCC Coordinator API
    location /ccc/api/ {
        proxy_pass http://localhost:5555/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # CCC Coordinator root
    location /ccc {
        proxy_pass http://localhost:5555/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # CCC Mock UI
    location /mock {
        proxy_pass http://localhost:5556/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

echo "Nginx config created at /tmp/ccc-nginx.conf"
echo ""
echo "To install (requires sudo):"
echo "  sudo cp /tmp/ccc-nginx.conf /etc/nginx/sites-available/ccc"
echo "  sudo ln -s /etc/nginx/sites-available/ccc /etc/nginx/sites-enabled/"
echo "  sudo nginx -t"
echo "  sudo systemctl reload nginx"
echo ""
echo "After installation, access from Windows:"
echo "  Coordinator: http://dailyernest.com:5557/ccc"
echo "  Mock UI:     http://dailyernest.com:5557/mock"
echo "  API Status:  http://dailyernest.com:5557/ccc/api/status"