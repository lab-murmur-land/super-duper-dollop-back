#!/bin/bash

SERVICE_NAME="super-duper-dollop-back.service"
SERVICE_DIR="$HOME/.config/systemd/user"
APP_DIR="$(pwd)"
NODE_PATH=$(which node)

if [ -z "$NODE_PATH" ]; then
    NODE_PATH="/usr/bin/node"
fi

echo "📦 Servis dosyası oluşturuluyor..."

cat <<EOF > $SERVICE_NAME
[Unit]
Description=Super Duper Dollop Backend Service
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
ExecStart=$NODE_PATH src/server.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=default.target
EOF

echo "⚙️  Kullanıcı bazlı systemd dizini ayarlanıyor..."
mkdir -p "$SERVICE_DIR"
cp $SERVICE_NAME "$SERVICE_DIR/"

echo "🔄 Systemd yapılandırması yeniden yükleniyor..."
systemctl --user daemon-reload

echo "🚀 Servis aktifleştiriliyor ve başlatılıyor..."
systemctl --user enable $SERVICE_NAME
systemctl --user restart $SERVICE_NAME

echo "✅ Kurulum tamamlandı!"
echo ""
echo "📊 Durumu kontrol etmek için: systemctl --user status $SERVICE_NAME"
echo "📝 Logları izlemek için: journalctl --user -u $SERVICE_NAME -f"
echo "🛑 Durdurmak için: systemctl --user stop $SERVICE_NAME"
