#!/bin/bash
# ===== Қазтілші — скрипт деплоя на VPS =====
# Запуск: bash deploy.sh
# Требования: Ubuntu/Debian с доступом root или sudo

set -e

echo "╔══════════════════════════════════════╗"
echo "║  Қазтілші — деплой на VPS            ║"
echo "╚══════════════════════════════════════╝"

# --- 1. Установка Docker (если нет) ---
if ! command -v docker &> /dev/null; then
    echo "→ Устанавливаем Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo systemctl enable docker
    sudo systemctl start docker
    # Добавить текущего пользователя в группу docker
    sudo usermod -aG docker $USER
    echo "✓ Docker установлен"
else
    echo "✓ Docker уже установлен: $(docker --version)"
fi

# --- 2. Установка Docker Compose plugin (если нет) ---
if ! docker compose version &> /dev/null; then
    echo "→ Устанавливаем Docker Compose..."
    sudo apt-get update -qq
    sudo apt-get install -y docker-compose-plugin
    echo "✓ Docker Compose установлен"
else
    echo "✓ Docker Compose: $(docker compose version)"
fi

# --- 3. Установка Git (если нет) ---
if ! command -v git &> /dev/null; then
    echo "→ Устанавливаем Git..."
    sudo apt-get update -qq
    sudo apt-get install -y git
fi

# --- 4. Клонируем или обновляем репозиторий ---
APP_DIR="/opt/kaztilshi"

if [ -d "$APP_DIR" ]; then
    echo "→ Обновляем репозиторий..."
    cd "$APP_DIR"
    git pull origin main
else
    echo "→ Клонируем репозиторий..."
    sudo mkdir -p "$APP_DIR"
    sudo chown $USER:$USER "$APP_DIR"
    git clone https://github.com/belilovsky/kazakh-translate.git "$APP_DIR"
    cd "$APP_DIR"
fi

# --- 5. Настраиваем .env ---
if [ ! -f .env ]; then
    cp .env.example .env
    echo ""
    echo "╔══════════════════════════════════════════════════════╗"
    echo "║  ВАЖНО: Отредактируйте .env и добавьте API-ключи!  ║"
    echo "║  nano /opt/kaztilshi/.env                           ║"
    echo "╚══════════════════════════════════════════════════════╝"
    echo ""
    echo "Нужен минимум один ключ:"
    echo "  OPENAI_API_KEY    — лучшее качество перевода"
    echo "  HUGGINGFACE_API_KEY — казахская модель Tilmash"
    echo "  DEEPL_API_KEY     — DeepL (бета)"
    echo "  YANDEX_API_KEY    — Яндекс Переводчик"
    echo ""
    read -p "Отредактировали .env? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Откройте .env в другом терминале: nano /opt/kaztilshi/.env"
        echo "Затем запустите скрипт заново."
        exit 1
    fi
fi

# --- 6. Собираем и запускаем ---
echo "→ Собираем Docker образ (это может занять 2-3 минуты)..."
docker compose up -d --build

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  ✓ Қазтілші запущен!                            ║"
echo "║                                                  ║"
echo "║  URL: http://$(hostname -I | awk '{print $1}'):5000    ║"
echo "║  Логи: docker compose -f $APP_DIR/docker-compose.yml logs -f  ║"
echo "╚══════════════════════════════════════════════════╝"

# --- 7. Проверяем ---
echo ""
echo "→ Проверяем здоровье сервиса..."
sleep 5
if curl -sf http://localhost:5000/api/engines > /dev/null; then
    echo "✓ API отвечает — всё работает!"
    curl -s http://localhost:5000/api/engines | python3 -m json.tool 2>/dev/null || true
else
    echo "⚠ Сервис ещё запускается... Проверьте через минуту:"
    echo "  curl http://localhost:5000/api/engines"
fi
