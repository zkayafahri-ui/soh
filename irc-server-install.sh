#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# 🌐 irc.sohbetgo.net Otomatik Kurulum Scripti
# ───────────────────────────────────────────────────────────────
# Ubuntu 22.04 / Debian 12 üzerinde test edildi
# Tek komutla tam IRC sunucusu kurulumu (UnrealIRCd 6 + SSL)
#
# KULLANIM:
#   1. VPS'e ssh ile root olarak gir
#   2. Bu scripti yapıştır:  nano install.sh
#   3. Çalıştırılabilir yap: chmod +x install.sh
#   4. Çalıştır:            ./install.sh
# ═══════════════════════════════════════════════════════════════

set -e  # Hata olursa dur

# Renkler
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logo
clear
echo -e "${BLUE}"
cat << 'EOF'
   ╔═══════════════════════════════════════╗
   ║                                       ║
   ║      irc.sohbetgo.net Kurulumu        ║
   ║      UnrealIRCd 6 + SSL + Anope       ║
   ║                                       ║
   ╚═══════════════════════════════════════╝
EOF
echo -e "${NC}"

# Root kontrolü
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Bu scripti root olarak çalıştırmalısın!${NC}"
    echo "   sudo ./install.sh"
    exit 1
fi

# Bilgi al
echo -e "${YELLOW}📋 Kurulum bilgileri:${NC}"
read -p "   Domain (örn: irc.sohbetgo.net): " IRC_DOMAIN
read -p "   E-mail (Let's Encrypt için): " ADMIN_EMAIL
read -p "   IRC Operatör nick'in (örn: admin): " OPER_NICK
read -s -p "   IRC Operatör şifresi: " OPER_PASS
echo ""
read -s -p "   Services link şifresi (rastgele yaz): " SERVICES_PASS
echo ""
echo ""

# Onay
echo -e "${YELLOW}🔍 Özet:${NC}"
echo "   Domain: $IRC_DOMAIN"
echo "   Email:  $ADMIN_EMAIL"
echo "   Oper:   $OPER_NICK"
echo ""
read -p "Devam edilsin mi? (e/h): " CONFIRM
if [ "$CONFIRM" != "e" ]; then
    echo "İptal edildi."
    exit 0
fi

# Cloak keys oluştur
CLOAK1=$(openssl rand -hex 16)
CLOAK2=$(openssl rand -hex 16)
CLOAK3=$(openssl rand -hex 16)
RESTART_PASS=$(openssl rand -hex 16)
DIE_PASS=$(openssl rand -hex 16)

# ══════════════════════════════════════════════
echo -e "\n${GREEN}📦 [1/8] Sistem güncellemesi ve paketler...${NC}"
# ══════════════════════════════════════════════
apt update -qq
apt upgrade -y -qq
apt install -y -qq build-essential pkg-config libssl-dev libpcre2-dev \
    libargon2-dev libsodium-dev wget curl git nano ufw \
    certbot nginx python3-certbot-nginx

# ══════════════════════════════════════════════
echo -e "\n${GREEN}🔥 [2/8] Firewall yapılandırılıyor...${NC}"
# ══════════════════════════════════════════════
ufw --force reset > /dev/null
ufw default deny incoming > /dev/null
ufw default allow outgoing > /dev/null
ufw allow 22/tcp > /dev/null      # SSH
ufw allow 80/tcp > /dev/null      # HTTP
ufw allow 443/tcp > /dev/null     # HTTPS
ufw allow 6667/tcp > /dev/null    # IRC plaintext
ufw allow 6697/tcp > /dev/null    # IRC SSL
ufw allow 7000/tcp > /dev/null    # IRC server-to-server
ufw allow 8000/tcp > /dev/null    # WebSocket
ufw --force enable

# ══════════════════════════════════════════════
echo -e "\n${GREEN}👤 [3/8] ircd kullanıcısı oluşturuluyor...${NC}"
# ══════════════════════════════════════════════
if ! id "ircd" &>/dev/null; then
    useradd -m -s /bin/bash ircd
fi

# ══════════════════════════════════════════════
echo -e "\n${GREEN}🔒 [4/8] SSL sertifikası alınıyor...${NC}"
# ══════════════════════════════════════════════
systemctl stop nginx 2>/dev/null || true

certbot certonly --standalone --non-interactive --agree-tos \
    --email "$ADMIN_EMAIL" -d "$IRC_DOMAIN" || {
    echo -e "${RED}❌ SSL sertifikası alınamadı. DNS ayarlarını kontrol et:${NC}"
    echo "   $IRC_DOMAIN → bu VPS'in IP adresine A kaydı olmalı"
    echo "   Cloudflare proxy KAPALI olmalı (gri bulut)"
    exit 1
}

# Otomatik yenileme
echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl restart unrealircd'" \
    | crontab -

# SSL grup izinleri
groupadd -f ssl-cert
usermod -aG ssl-cert ircd
chgrp -R ssl-cert /etc/letsencrypt/{live,archive}
chmod -R 750 /etc/letsencrypt/{live,archive}

# ══════════════════════════════════════════════
echo -e "\n${GREEN}⚙️  [5/8] UnrealIRCd indiriliyor ve derleniyor...${NC}"
echo "   Bu adım 5-10 dakika sürebilir..."
# ══════════════════════════════════════════════
sudo -u ircd bash << EOSU
cd ~
if [ ! -d unrealircd-source ]; then
    wget -q https://www.unrealircd.org/downloads/unrealircd-latest.tar.gz
    tar -xzf unrealircd-latest.tar.gz
    mv unrealircd-* unrealircd-source
fi
cd unrealircd-source

# Otomatik konfigürasyon (interaktif değil)
cat > /tmp/unrealircd-config-answers << EOF2
/home/ircd/unrealircd
8192
y
y
n
n
y
y
EOF2

./Config -nointro < /tmp/unrealircd-config-answers > /tmp/unrealircd-config.log 2>&1 || {
    echo "Config hatası, log: /tmp/unrealircd-config.log"
    exit 1
}

make -j$(nproc) > /tmp/unrealircd-build.log 2>&1 || {
    echo "Build hatası, log: /tmp/unrealircd-build.log"
    exit 1
}
make install > /tmp/unrealircd-install.log 2>&1
EOSU

# ══════════════════════════════════════════════
echo -e "\n${GREEN}📝 [6/8] UnrealIRCd konfigürasyonu yazılıyor...${NC}"
# ══════════════════════════════════════════════
cat > /home/ircd/unrealircd/conf/unrealircd.conf << EOF
/* irc.sohbetgo.net — Auto-generated config */

include "modules.default.conf";
include "operclass.default.conf";
include "snomasks.default.conf";
include "help/help.conf";
include "badwords.conf";
include "spamfilter.conf";

me {
    name "$IRC_DOMAIN";
    info "SohbetGo IRC Network";
    sid "001";
}

admin {
    "SohbetGo Admin";
    "$OPER_NICK";
    "$ADMIN_EMAIL";
}

set {
    network-name "SohbetGo";
    default-server "$IRC_DOMAIN";
    services-server "services.sohbetgo.net";
    stats-server "stats.sohbetgo.net";
    help-channel "#yardim";
    
    cloak-keys {
        "$CLOAK1";
        "$CLOAK2";
        "$CLOAK3";
    }
    
    cloak-prefix "sohbetgo";
    
    options {
        hide-ulines;
        identd-check;
    }
    
    modes-on-connect "+ixw";
    modes-on-oper "+xwgs";
    snomask-on-oper "+cFfkejvGqsSo";
    modes-on-join "+nt";
    
    auto-join "#genel";
    
    static-quit "Hoşçakalın!";
    
    anti-flood {
        everyone {
            nick-flood 3:60;
            join-flood 3:90;
            connect-flood 3:60;
            target-flood {
                channel 60:30;
                private 30:15;
            }
        }
    }
    
    max-channels-per-user 30;
    
    plaintext-policy {
        user warn;
        oper deny;
        server deny;
    }
}

/* Listening ports */
listen { ip *; port 6667; options { clientsonly; } }

listen {
    ip *; port 6697;
    options { clientsonly; tls; }
    tls-options {
        certificate "/etc/letsencrypt/live/$IRC_DOMAIN/fullchain.pem";
        key "/etc/letsencrypt/live/$IRC_DOMAIN/privkey.pem";
    }
}

listen {
    ip *; port 8000;
    options { clientsonly; tls; }
    tls-options {
        certificate "/etc/letsencrypt/live/$IRC_DOMAIN/fullchain.pem";
        key "/etc/letsencrypt/live/$IRC_DOMAIN/privkey.pem";
    }
}

listen {
    ip *; port 7000;
    options { serversonly; tls; }
    tls-options {
        certificate "/etc/letsencrypt/live/$IRC_DOMAIN/fullchain.pem";
        key "/etc/letsencrypt/live/$IRC_DOMAIN/privkey.pem";
    }
}

allow {
    mask *@*;
    class clients;
    maxperip 5;
}

class clients {
    pingfreq 90;
    maxclients 1000;
    sendq 200k;
    recvq 8000;
}

class servers {
    pingfreq 60;
    connfreq 15;
    maxclients 10;
    sendq 20M;
}

class opers {
    pingfreq 90;
    maxclients 50;
    sendq 1M;
    recvq 8000;
}

oper $OPER_NICK {
    class opers;
    mask *@*;
    password "$OPER_PASS";
    operclass netadmin;
    swhois "SohbetGo Network Admin";
    vhost admin.sohbetgo.net;
}

ulines {
    services.sohbetgo.net;
}

link services.sohbetgo.net {
    incoming { mask 127.0.0.1; }
    password "$SERVICES_PASS";
    class servers;
}

blacklist dronebl {
    dns {
        name "dnsbl.dronebl.org";
        type record;
        reply { 3; 5; 6; 7; 8; 9; 10; 11; 13; 14; 15; }
    }
    action gline;
    ban-time 24h;
    reason "DroneBL: Drone tespit edildi";
}

log "ircd.log" {
    flags { all; }
    maxsize 100M;
}

drpass {
    restart "$RESTART_PASS";
    die "$DIE_PASS";
}

files {
    motd "ircd.motd";
    botmotd "bot.motd";
    rules "ircd.rules";
}
EOF

# MOTD
cat > /home/ircd/unrealircd/conf/ircd.motd << EOF
   ╔═══════════════════════════════════════╗
   ║                                       ║
   ║        SohbetGo IRC Network           ║
   ║         $IRC_DOMAIN                   
   ║                                       ║
   ╠═══════════════════════════════════════╣
   ║                                       ║
   ║  Hoşgeldin! Türkiye'nin yeni nesil    ║
   ║  IRC ağına bağlandın.                ║
   ║                                       ║
   ║  Popüler kanallar:                   ║
   ║    /join #genel                       ║
   ║    /join #sohbet                      ║
   ║    /join #yardim                      ║
   ║                                       ║
   ║  Web: https://sohbetgo.net           ║
   ║                                       ║
   ╚═══════════════════════════════════════╝
EOF

# Rules
cat > /home/ircd/unrealircd/conf/ircd.rules << 'EOF'
SohbetGo IRC Kurallari:
  1. Saygili olun
  2. Spam ve flood yapmayin
  3. Reklam yasaktir
  4. +18 icerik paylasmayin
  5. Operator kararlarina saygi gosterin
EOF

# bot.motd (kullanılır)
cp /home/ircd/unrealircd/conf/ircd.motd /home/ircd/unrealircd/conf/bot.motd

chown -R ircd:ircd /home/ircd/unrealircd/

# ══════════════════════════════════════════════
echo -e "\n${GREEN}🔧 [7/8] Systemd service oluşturuluyor...${NC}"
# ══════════════════════════════════════════════
cat > /etc/systemd/system/unrealircd.service << 'EOF'
[Unit]
Description=UnrealIRCd
After=network.target

[Service]
Type=forking
User=ircd
Group=ircd
ExecStart=/home/ircd/unrealircd/unrealircd start
ExecStop=/home/ircd/unrealircd/unrealircd stop
ExecReload=/home/ircd/unrealircd/unrealircd reload
PIDFile=/home/ircd/unrealircd/data/unrealircd.pid
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable unrealircd

# ══════════════════════════════════════════════
echo -e "\n${GREEN}🚀 [8/8] UnrealIRCd başlatılıyor...${NC}"
# ══════════════════════════════════════════════
sudo -u ircd /home/ircd/unrealircd/unrealircd configtest > /tmp/configtest.log 2>&1 || {
    echo -e "${RED}❌ Konfigürasyon testi başarısız!${NC}"
    cat /tmp/configtest.log
    exit 1
}

systemctl start unrealircd
sleep 3

if systemctl is-active --quiet unrealircd; then
    echo -e "${GREEN}✅ UnrealIRCd başarıyla çalışıyor!${NC}"
else
    echo -e "${RED}❌ UnrealIRCd başlatılamadı!${NC}"
    systemctl status unrealircd
    exit 1
fi

# ══════════════════════════════════════════════
# BAŞARILI!
# ══════════════════════════════════════════════
clear
echo -e "${GREEN}"
cat << EOF
   ╔═══════════════════════════════════════╗
   ║                                       ║
   ║       ✅ KURULUM TAMAMLANDI!          ║
   ║                                       ║
   ╚═══════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${BLUE}🌐 Bağlantı Bilgileri:${NC}"
echo "   Sunucu:       $IRC_DOMAIN"
echo "   Port:         6697 (SSL) ⭐"
echo "   Port:         6667 (plain — önerilmez)"
echo ""
echo -e "${BLUE}👑 Operatör:${NC}"
echo "   Nick:         $OPER_NICK"
echo "   Şifre:        ********"
echo "   Olmak için:   /OPER $OPER_NICK ŞIFRE"
echo ""
echo -e "${BLUE}🧪 Test:${NC}"
echo "   HexChat / mIRC ile bağlan:"
echo "   $IRC_DOMAIN +6697"
echo ""
echo "   Veya tarayıcıdan KiwiIRC ile:"
echo "   https://kiwiirc.com/nextclient/$IRC_DOMAIN/?nick=test&channels=%23genel"
echo ""
echo -e "${BLUE}📋 Yararlı Komutlar:${NC}"
echo "   systemctl status unrealircd     — durum"
echo "   systemctl restart unrealircd    — yeniden başlat"
echo "   systemctl stop unrealircd       — durdur"
echo "   tail -f /home/ircd/unrealircd/logs/ircd.log   — loglar"
echo ""
echo -e "${YELLOW}🔐 Önemli Şifreler (kaydet!):${NC}"
echo "   Restart şifresi: $RESTART_PASS"
echo "   Die şifresi:     $DIE_PASS"
echo "   Services şifresi: $SERVICES_PASS"
echo ""
echo -e "${YELLOW}📚 Sıradaki Adım: NickServ kurulumu${NC}"
echo "   Anope Services kurulumu için IRC_SERVER_KURULUM.md dosyasındaki"
echo "   ADIM 8'i takip et."
echo ""
echo -e "${GREEN}🎉 İyi sohbetler!${NC}"
