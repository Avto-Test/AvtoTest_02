#!/usr/bin/env bash
# AvtoTest — server-side deploy skripti (CI/CD tomonidan SSH orqali chaqiriladi).
# Vazifa: DB backup -> build -> up -d -> smoke test. Smoke test fail bo'lsa -> rollback.
#
# Bu skript serverda `/var/www/AvtoTest_02` ichida, `git pull`dan KEYIN ishga tushadi,
# shuning uchun u doim eng yangi versiya bo'ladi.
#
# Talab qilinadigan: .env.prod (serverda, gitignored) — DB_USER/DB_NAME/DB_PASSWORD bor.
set -Eeuo pipefail

PROJECT_DIR="${PROJECT_DIR:-/var/www/AvtoTest_02}"
COMPOSE_FILE="$PROJECT_DIR/deploy/docker-compose.yml"
ENV_FILE="$PROJECT_DIR/.env.prod"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/autotest}"
DB_CONTAINER="autotest-db-prod"

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

log() { echo "[deploy] $*"; }

cd "$PROJECT_DIR"

# Deploy boshidagi commit — rollback uchun kerak.
PREV_COMMIT="$(git rev-parse HEAD)"
log "Joriy commit: $PREV_COMMIT"

if [[ ! -f "$ENV_FILE" ]]; then
  log "XATO: $ENV_FILE topilmadi. Deploy to'xtatildi."
  exit 1
fi

# .env.prod dan DB ma'lumotlarini olish (backup uchun).
# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

# ── 1. DB backup ──────────────────────────────────────────────────────
if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  mkdir -p "$BACKUP_DIR"
  BACKUP_FILE="$BACKUP_DIR/autotest_prod_$(date +%Y%m%d_%H%M%S).sql.gz"
  log "DB backup: $BACKUP_FILE"
  docker exec "$DB_CONTAINER" pg_dump -U "${DB_USER}" "${DB_NAME}" | gzip > "$BACKUP_FILE"
  log "Backup tayyor ($(du -h "$BACKUP_FILE" | cut -f1))"
  # Faqat oxirgi 10 ta backupni saqlash.
  ls -1t "$BACKUP_DIR"/autotest_prod_*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm -f
else
  log "OGOHLANTIRISH: $DB_CONTAINER ishlamayapti — backup o'tkazib yuborildi (birinchi deploy?)"
fi

# ── 2. Build ──────────────────────────────────────────────────────────
log "Image'lar build qilinmoqda..."
compose build

# ── 3. Up (migration entrypoint.sh ichida avtomatik ishlaydi) ─────────
log "Servislar ko'tarilmoqda..."
compose up -d

# ── 4. Smoke test ─────────────────────────────────────────────────────
log "Smoke test (60s gacha kutiladi)..."
ok=0
for i in $(seq 1 12); do
  fe="$(curl -s -o /dev/null -w '%{http_code}' http://localhost/ || true)"
  be="$(curl -s -o /dev/null -w '%{http_code}' http://localhost/api/auth/me || true)"
  # FE 200, BE 401 (cookie yo'q) — sog'lom holat.
  if [[ "$fe" == "200" && "$be" == "401" ]]; then
    ok=1
    log "Smoke OK (frontend=$fe, backend=$be)"
    break
  fi
  log "kutilmoqda... (frontend=$fe, backend=$be) [$i/12]"
  sleep 5
done

if [[ "$ok" != "1" ]]; then
  log "XATO: smoke test fail. ROLLBACK -> $PREV_COMMIT"
  git reset --hard "$PREV_COMMIT"
  compose build
  compose up -d
  log "Rollback bajarildi. Loglarni tekshiring:"
  docker ps --format 'table {{.Names}}\t{{.Status}}'
  exit 1
fi

# ── 5. Tozalash ───────────────────────────────────────────────────────
docker image prune -f >/dev/null 2>&1 || true

log "Deploy muvaffaqiyatli ✓"
docker ps --format 'table {{.Names}}\t{{.Status}}'
