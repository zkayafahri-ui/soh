# 🌐 irc.sohbetgo.net — IRC Sunucu Kurulum Rehberi

Tam profesyonel IRC sunucusu kurulumu: **UnrealIRCd 6** + **Anope Services** (NickServ/ChanServ) + **WebSocket** + **SSL/TLS** + **Webchat**.

---

## 📋 Gerekenler

### 1️⃣ VPS (Sanal Sunucu) Önerileri

| Sağlayıcı | Plan | Aylık | Not |
|---|---|---|---|
| **Hetzner Cloud** ⭐ | CX11 (1 vCPU, 2GB) | ~€4 | En iyi fiyat/performans |
| **Contabo** | VPS S | €5 | Cömert kaynak |
| **DigitalOcean** | Basic | $6 | Kolay arayüz |
| **Vultr** | Regular | $6 | Türkiye yakın (Frankfurt) |
| **Oracle Cloud** ⭐ | Always Free | **€0** | Ömür boyu ücretsiz! |

**Tavsiye:** Yeni başlayan için **Oracle Cloud Free Tier** (4 vCPU, 24GB RAM, ÜCRETSİZ).
Bütçen varsa: **Hetzner Cloud CX21** (€5.5/ay, kaya gibi).

### 2️⃣ İşletim Sistemi
**Ubuntu 22.04 LTS** veya **Debian 12** (önerilen)

### 3️⃣ Domain DNS Ayarları (Cloudflare)

Cloudflare Dashboard → `sohbetgo.net` → **DNS → Records**:

```
Type   Name           Content                  Proxy   TTL
─────────────────────────────────────────────────────────
A      irc            [VPS IPv4 adresin]       DNS only ⚠️ ÖNEMLİ
AAAA   irc            [VPS IPv6 adresin]       DNS only
A      webchat        [VPS IPv4 adresin]       Proxied ✅
```

⚠️ **DİKKAT:** `irc` subdomain'inde Cloudflare proxy **kapalı** (gri bulut) olmalı! IRC TCP üzerinden çalışır, Cloudflare proxy sadece HTTP/HTTPS destekler.

---

## 🚀 ADIM ADIM KURULUM

### 📍 ADIM 1: VPS'e Bağlan ve Hazırla

```bash
# SSH ile bağlan
ssh root@VPS_IP_ADRESIN

# Sistemi güncelle
apt update && apt upgrade -y

# Gerekli paketleri kur
apt install -y build-essential pkg-config libssl-dev libpcre2-dev \
  libargon2-dev libsodium-dev wget curl git nano ufw \
  certbot nginx nodejs npm

# IRC için kullanıcı oluştur (güvenlik için root kullanma!)
useradd -m -s /bin/bash ircd
passwd ircd  # bir şifre belirle
```

### 📍 ADIM 2: Firewall Ayarları

```bash
# UFW kurulumu
ufw default deny incoming
ufw default allow outgoing

# Gerekli portları aç
ufw allow 22/tcp        # SSH
ufw allow 80/tcp        # HTTP (Let's Encrypt)
ufw allow 443/tcp       # HTTPS (webchat)
ufw allow 6667/tcp      # IRC plaintext
ufw allow 6697/tcp      # IRC SSL
ufw allow 7000/tcp      # IRC server-to-server (linkler için)
ufw allow 8000/tcp      # WebSocket IRC

# Aktif et
ufw enable
ufw status
```

### 📍 ADIM 3: SSL Sertifikası (Let's Encrypt)

```bash
# Geçici nginx durdur
systemctl stop nginx

# Sertifika al
certbot certonly --standalone \
  -d irc.sohbetgo.net \
  -d webchat.sohbetgo.net \
  --email senin@email.com \
  --agree-tos \
  --non-interactive

# Sertifikalar buraya gelir:
# /etc/letsencrypt/live/irc.sohbetgo.net/fullchain.pem
# /etc/letsencrypt/live/irc.sohbetgo.net/privkey.pem

# UnrealIRCd'nin okuyabilmesi için izin ver
chmod -R 755 /etc/letsencrypt/live
chmod -R 755 /etc/letsencrypt/archive

# Otomatik yenileme cronjob
echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl restart unrealircd'" \
  | crontab -
```

### 📍 ADIM 4: UnrealIRCd 6 Kurulumu

```bash
# ircd kullanıcısına geç
su - ircd

# UnrealIRCd indir (en son sürüm)
cd ~
wget https://www.unrealircd.org/downloads/unrealircd-latest.tar.gz
tar -xzf unrealircd-latest.tar.gz
cd unrealircd-*/

# Konfigürasyon (interaktif)
./Config

# Sorulara cevaplar:
# - Install path:           /home/ircd/unrealircd
# - Maximum connections:    8192
# - SSL/TLS:                Yes
# - SSL/TLS curl:           Yes (otomatik kurar)
# - Remote includes:        No
# - Privatedeaf channels:   No
# - Show listmodes:         Yes
# - Anti-spoof:             Yes

# Derle ve kur (5-10 dk sürebilir)
make
make install

# Konfigürasyon dosyasına git
cd ~/unrealircd/conf/
```

### 📍 ADIM 5: UnrealIRCd Konfigürasyonu

`~/unrealircd/conf/unrealircd.conf` dosyasını oluştur:

```bash
cat > ~/unrealircd/conf/unrealircd.conf << 'EOF'
/* irc.sohbetgo.net — UnrealIRCd 6 Konfigürasyonu */

include "modules.default.conf";
include "operclass.default.conf";
include "snomasks.default.conf";
include "help/help.conf";
include "badwords.conf";
include "spamfilter.conf";

/* Network bilgisi */
me {
    name "irc.sohbetgo.net";
    info "SohbetGo IRC Network";
    sid "001";
}

admin {
    "SohbetGo Admin";
    "admin";
    "admin@sohbetgo.net";
}

/* Network ayarları */
set {
    network-name "SohbetGo";
    default-server "irc.sohbetgo.net";
    services-server "services.sohbetgo.net";
    stats-server "stats.sohbetgo.net";
    help-channel "#yardim";
    
    cloak-keys {
        "rastgeleBirSifre1234567890abc";
        "baskaBirRastgeleSifre0987654321";
        "ucuncuRastgeleSifreXyzAbc12345";
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
    
    oper-auto-join "#opers";
    
    static-quit "Hoşçakalın!";
    static-part "yes";
    
    who-limit 100;
    silence-limit 15;
    
    anti-spam-quit-message-time 10s;
    
    channel-command-prefix "`!.";
    
    restrict-commands {
        list {
            connect-delay 60;
        }
        invite {
            connect-delay 60;
        }
        knock {
            connect-delay 60;
        }
    }
    
    anti-flood {
        everyone {
            nick-flood 3:60;
            join-flood 3:90;
            invite-flood 4:120;
            knock-flood 4:120;
            connect-flood 3:60;
            target-flood {
                channel 60:30;
                private 30:15;
                user 5:5;
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
listen {
    ip *;
    port 6667;
    options { clientsonly; }
}

listen {
    ip *;
    port 6697;
    options { clientsonly; tls; }
    tls-options {
        certificate "/etc/letsencrypt/live/irc.sohbetgo.net/fullchain.pem";
        key "/etc/letsencrypt/live/irc.sohbetgo.net/privkey.pem";
    }
}

/* WebSocket — webchat için */
listen {
    ip *;
    port 8000;
    options { clientsonly; tls; }
    tls-options {
        certificate "/etc/letsencrypt/live/irc.sohbetgo.net/fullchain.pem";
        key "/etc/letsencrypt/live/irc.sohbetgo.net/privkey.pem";
    }
}

/* Server linking için */
listen {
    ip *;
    port 7000;
    options { serversonly; tls; }
    tls-options {
        certificate "/etc/letsencrypt/live/irc.sohbetgo.net/fullchain.pem";
        key "/etc/letsencrypt/live/irc.sohbetgo.net/privkey.pem";
    }
}

/* Allow tüm IP'lerden bağlantı */
allow {
    mask *@*;
    class clients;
    maxperip 5;
}

/* Class tanımları */
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

/* IRC Operatör (kendin için) */
oper admin {
    class opers;
    mask *@*;
    password "BURAYA_GUCLU_SIFRE_KOY";
    operclass netadmin;
    swhois "SohbetGo Network Admin";
    vhost admin.sohbetgo.net;
}

/* ULines - Services için güven */
ulines {
    services.sohbetgo.net;
}

/* Services bağlantısı */
link services.sohbetgo.net {
    incoming {
        mask 127.0.0.1;
    }
    password "ServicesIcinSifre123";
    class servers;
}

/* Drone protection */
blacklist dronebl {
    dns {
        name "dnsbl.dronebl.org";
        type record;
        reply { 3; 5; 6; 7; 8; 9; 10; 11; 13; 14; 15; }
    }
    action gline;
    ban-time 24h;
    reason "DroneBL: Drone tespit edildi (https://dronebl.org/lookup?ip=$ip)";
}

/* Default kanallar */
log "ircd.log" {
    flags { all; }
    maxsize 100M;
}

/* Drpass - servis şifreleri */
drpass {
    restart "RestartSifresi123";
    die "DieSifresi123";
}

/* Files */
files {
    motd "ircd.motd";
    botmotd "bot.motd";
    rules "ircd.rules";
}

/* MOTD - Hoşgeldin mesajı */
EOF

# MOTD dosyası
cat > ~/unrealircd/conf/ircd.motd << 'EOF'
   ╔═══════════════════════════════════════╗
   ║                                       ║
   ║        SohbetGo IRC Network           ║
   ║         irc.sohbetgo.net              ║
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
   ║  Webchat: webchat.sohbetgo.net       ║
   ║                                       ║
   ╚═══════════════════════════════════════╝
EOF

# Rules
cat > ~/unrealircd/conf/ircd.rules << 'EOF'
SohbetGo IRC Kuralları:
  1. Saygılı olun
  2. Spam ve flood yapmayın
  3. Reklam yasaktır
  4. +18 içerik paylaşmayın
  5. Operatör kararlarına saygı gösterin
EOF
```

### 📍 ADIM 6: SSL Sertifikalarına Erişim İzni

```bash
# Root olarak (ircd kullanıcısından çık)
exit

# ircd grubunu oluştur ve ircd'yi ekle
groupadd -f ssl-cert
usermod -aG ssl-cert ircd

# Sertifikaları ssl-cert grubuna ver
chgrp -R ssl-cert /etc/letsencrypt/live
chgrp -R ssl-cert /etc/letsencrypt/archive
chmod -R 750 /etc/letsencrypt/live
chmod -R 750 /etc/letsencrypt/archive
```

### 📍 ADIM 7: UnrealIRCd'yi Başlat

```bash
# ircd kullanıcısına geç
su - ircd

# Konfigürasyonu test et
~/unrealircd/unrealircd configtest

# Hata yoksa başlat
~/unrealircd/unrealircd start

# Durumu kontrol et
~/unrealircd/unrealircd status

# Logları gör
tail -f ~/unrealircd/logs/ircd.log
```

✅ **Kontrol:** Şimdi mIRC, HexChat, KiwiIRC ile `irc.sohbetgo.net` portu `6697` (SSL) bağlanmayı deneyebilirsin!

### 📍 ADIM 8: Anope Services (NickServ/ChanServ)

```bash
# ircd olarak
cd ~
wget https://github.com/anope/anope/releases/download/2.0.16/anope-2.0.16-source.tar.gz
tar -xzf anope-2.0.16-source.tar.gz
cd anope-2.0.16-source

# Build
./Config
# Sorulara enter ile devam, hepsi default

cd build
make
make install

cd ~/services/conf
cp example.conf services.conf
nano services.conf
```

services.conf'ta şu kısımları düzenle:

```conf
uplink
{
    host = "127.0.0.1"
    ipv6 = no
    ssl = no
    port = 7000
    password = "ServicesIcinSifre123"
}

serverinfo
{
    name = "services.sohbetgo.net"
    description = "SohbetGo Services"
    pid = "data/services.pid"
    motd = "conf/services.motd"
}

module { name = "unreal4" }

networkinfo
{
    networkname = "SohbetGo"
    nicklen = 31
    userlen = 10
    hostlen = 64
    chanlen = 32
}
```

```bash
# Services'ı başlat
~/services/bin/services
```

### 📍 ADIM 9: Webchat Kurulumu (KiwiIRC Self-hosted)

```bash
# Root ol
exit  # ircd'den çık

# KiwiIRC için klasör
mkdir -p /var/www/webchat
cd /var/www/webchat

# KiwiIRC indir
wget https://kiwiirc.com/files/kiwiirc-latest.tar.gz
tar -xzf kiwiirc-latest.tar.gz

# Yapılandır
cat > /var/www/webchat/static/config.json << 'EOF'
{
    "windowTitle": "SohbetGo IRC Webchat",
    "startupScreen": "welcome",
    "startupOptions": {
        "server": "irc.sohbetgo.net",
        "port": 8000,
        "tls": true,
        "channel": "#genel",
        "nick": "Misafir?",
        "direct": true
    },
    "showAutoComplete": true,
    "themes": [
        { "name": "Default", "url": "static/themes/default" },
        { "name": "Dark", "url": "static/themes/mini-dark" }
    ],
    "default_theme": "Dark"
}
EOF

# Nginx ayarı
cat > /etc/nginx/sites-available/webchat << 'EOF'
server {
    listen 80;
    server_name webchat.sohbetgo.net;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name webchat.sohbetgo.net;
    
    ssl_certificate /etc/letsencrypt/live/irc.sohbetgo.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/irc.sohbetgo.net/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    root /var/www/webchat;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # WebSocket reverse proxy (IRC sunucusuna)
    location /websocket {
        proxy_pass https://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

ln -s /etc/nginx/sites-available/webchat /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx
```

✅ Şimdi `https://webchat.sohbetgo.net` adresinden tarayıcıdan IRC'e bağlanılabilir!

### 📍 ADIM 10: Otomatik Başlatma (systemd)

```bash
# UnrealIRCd systemd service
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

[Install]
WantedBy=multi-user.target
EOF

# Anope services systemd
cat > /etc/systemd/system/anope.service << 'EOF'
[Unit]
Description=Anope IRC Services
After=network.target unrealircd.service
Requires=unrealircd.service

[Service]
Type=forking
User=ircd
Group=ircd
ExecStart=/home/ircd/services/bin/services
PIDFile=/home/ircd/services/data/services.pid
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable unrealircd anope
systemctl start unrealircd
sleep 5
systemctl start anope

# Durumlar
systemctl status unrealircd
systemctl status anope
```

---

## 🎯 BAĞLANMA TEST

### Bilgisayardan (HexChat / mIRC)
```
Sunucu:   irc.sohbetgo.net
Port:     6697
SSL:      ✅ Açık
Nick:     SenInikin
Kanal:    /join #genel
```

### Tarayıcıdan
👉 https://webchat.sohbetgo.net

### Mobile (Goguma / Colloquy)
```
Server: irc.sohbetgo.net:6697 (SSL)
```

---

## 🔧 NickServ Komutları (Kullanıcılar için)

```
/msg NickServ REGISTER <şifre> <email>
/msg NickServ IDENTIFY <şifre>
/msg NickServ INFO <nick>
/msg NickServ DROP <nick>

/msg ChanServ REGISTER #kanal <şifre> <açıklama>
/msg ChanServ IDENTIFY #kanal <şifre>
/msg ChanServ ACCESS #kanal ADD <nick> <level>
```

---

## 📊 Sunucu İstatistikleri

```bash
# Anlık bağlı kullanıcı sayısı
nc localhost 6667 <<< "STATS u" 

# Loglar
tail -f /home/ircd/unrealircd/logs/ircd.log
tail -f /home/ircd/services/logs/services.log

# Kaynak kullanımı
top -u ircd
htop  # daha güzeli
```

---

## 🛡️ Güvenlik Önerileri

1. **fail2ban** kur:
   ```bash
   apt install fail2ban
   ```

2. **SSH güvenliği:** sadece SSH key ile giriş, root login kapalı:
   ```bash
   nano /etc/ssh/sshd_config
   # PermitRootLogin no
   # PasswordAuthentication no
   systemctl restart sshd
   ```

3. **Düzenli yedek:**
   ```bash
   # /home/ircd/ klasörünü backup'la
   tar -czf irc-backup-$(date +%F).tar.gz /home/ircd/
   ```

4. **DroneBL & DNSBL** zaten yapılandırıldı (kötü IP'ler otomatik banlanır)

5. **Operatör şifresi** çok güçlü olsun, configdeki tüm `Sifre123` kısımlarını değiştir!

---

## 🌐 SohbetGo'ya Bağlama (İleride)

Hazır olduğunda SohbetGo'daki IRC Bridge sayfasına `irc.sohbetgo.net`'i ilk seçenek yapabiliriz. Şu anki kodda:

```typescript
// src/data/ircServers.ts
{
  id: "sohbetgo",
  name: "SohbetGo IRC ⭐",
  host: "irc.sohbetgo.net",
  ssl: true,
  description: "Bizim kendi IRC sunucumuz!",
  flag: "💬",
  popular: true,
  channels: ["#genel", "#sohbet", "#yardim", "#oyun", "#muzik"],
}
```

Bu objeyi ircServers.ts'ye eklersek anında çalışır!

---

## 💰 Maliyet Özeti

| Kalem | Yıllık |
|---|---|
| VPS (Hetzner CX21) | ~€66 |
| Domain (zaten var) | €0 |
| SSL (Let's Encrypt) | €0 |
| UnrealIRCd, Anope | €0 (open source) |
| **TOPLAM** | **~€66/yıl** |

Oracle Cloud Free Tier kullanırsan: **€0/yıl** 🎉

---

## 🆘 Yardım & Sorun Giderme

### IRC bağlanmıyor
```bash
# Port açık mı?
netstat -tulpn | grep -E "6667|6697"

# Firewall kontrolü
ufw status

# UnrealIRCd çalışıyor mu?
systemctl status unrealircd

# Log
tail -100 /home/ircd/unrealircd/logs/ircd.log
```

### SSL hatası
```bash
# Sertifikaları yenile
certbot renew --force-renewal

# İzinleri tekrar ayarla
chgrp -R ssl-cert /etc/letsencrypt/{live,archive}

# IRC'i yeniden başlat
systemctl restart unrealircd
```

### NickServ çalışmıyor
```bash
# Anope çalışıyor mu?
systemctl status anope

# Services link aktif mi?
echo "STATS l" | nc localhost 6667 | grep services
```

---

## 📚 Kaynaklar

- UnrealIRCd Docs: https://www.unrealircd.org/docs/
- Anope Docs: https://docs.anope.org/
- KiwiIRC: https://github.com/kiwiirc/kiwiirc
- IRC RFC: https://datatracker.ietf.org/doc/html/rfc2812

---

## 🎉 Kurulum Tamamlandı!

Artık Türkiye'nin yeni nesil **kendi IRC sunucusu** sahibisin:
- ✅ `irc.sohbetgo.net:6697` (SSL)
- ✅ `webchat.sohbetgo.net` (web client)
- ✅ NickServ ile nick koruma
- ✅ ChanServ ile kanal yönetimi
- ✅ Otomatik DroneBL koruması
- ✅ systemd ile otomatik başlatma

🚀 **İyi sohbetler!**
