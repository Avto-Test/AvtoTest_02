# AvtoTest Deployment Guide

Production serverda git'dan yangi o'zgarishlarni olish va deploy qilish ketma-ketligi.

**Loyiha yo'li:** `/var/www/AvtoTest_02`
**Stack:** Docker Compose (db, backend, frontend, nginx)
**Env fayl:** `.env.prod` (gitignored, faqat serverda mavjud)

---

## 0. Oldindan tayyorgarlik

Har safar deploy boshlamasdan oldin:

```bash
cd /var/www/AvtoTest_02

# Hozirgi holatni ko'rish
git status
git log --oneline -3
docker ps --format "table {{.Names}}\t{{.Status}}"
```

Agar `git status` da o'zgarishlar bo'lsa (siz qilmagan) — to'xtang, sababini aniqlang. Hech qachon "blind" `git pull` yoki `git reset` qilmang.

---

## 1. Git'dan yangilash

```bash
# Asosiy branchga o'tish (yoki kerakli branchga)
git fetch origin
git checkout clean_architecture
git pull origin clean_architecture
```

**Nima o'zgarganini ko'ring:**

```bash
git log --oneline HEAD@{1}..HEAD
git diff --stat HEAD@{1}..HEAD
```

Bu sizga qaysi qismni qayta build qilish kerakligini aytadi:

| O'zgargan papka | Nima qilish kerak |
|---|---|
| `backend/` | Backend rebuild + restart |
| `frontend/` | Frontend rebuild + restart |
| `deploy/nginx.conf` | Nginx reload (rebuild kerak emas) |
| `deploy/docker-compose.yml` | To'liq stack restart |
| `deploy/Dockerfile.*` | Tegishli servisni rebuild |
| `.env.prod.example` | Faqat reference, ta'sir yo'q |
| `docs/`, `*.md` | Hech narsa qilish shart emas |
| `backend/alembic/versions/*` | Migratsiya kerak (3-bo'limga qarang) |

---

## 2. Backend o'zgargan bo'lsa

### 2.1. Image'ni qayta build qilish

```bash
docker compose --env-file .env.prod -f deploy/docker-compose.yml build backend
```

### 2.2. Faqat backend container'ni qayta tushirish

```bash
docker compose --env-file .env.prod -f deploy/docker-compose.yml up -d --no-deps backend
```

⚠️ **MUHIM — `--no-deps` shart!** Aks holda compose db container'ni ham qayta yaratishi mumkin (oldin sodir bo'lgan voqea).

⚠️ **MUHIM — `--env-file .env.prod` shart!** Aks holda `${DB_USER}` kabi o'zgaruvchilar bo'sh string'ga aylanadi va container'ning desired state'i buziladi.

### 2.3. Backend sog'lig'ini tekshirish

```bash
# Container holati
docker ps --filter "name=autotest-backend-prod" --format "{{.Names}} {{.Status}}"

# Loglar — startup'ni kuting
docker logs --tail 30 autotest-backend-prod

# API javob beradimi?
curl -s -o /dev/null -w "%{http_code}\n" http://localhost/api/auth/me
# 401 kelishi kerak (cookie yo'q, normal)
```

---

## 3. Migratsiya (alembic) kerak bo'lsa

Agar `backend/alembic/versions/` da yangi fayl bo'lsa:

```bash
# Backend container ichida alembic'ni ishga tushirish
docker exec autotest-backend-prod alembic upgrade head

# Tekshirish — joriy versiya
docker exec autotest-backend-prod alembic current
```

⚠️ Migratsiyani ishga tushirishdan **oldin** DB backup oling (4-bo'limga qarang).

---

## 4. DB backup (har bir prod deploy oldidan tavsiya etiladi)

```bash
mkdir -p /var/backups/autotest
BACKUP_FILE="/var/backups/autotest/autotest_prod_$(date +%Y%m%d_%H%M%S).sql.gz"
docker exec autotest-db-prod pg_dump -U autotest_prod autotest_prod | gzip > "$BACKUP_FILE"
ls -lh "$BACKUP_FILE"
```

Tiklash (faqat avariya holatida):

```bash
gunzip -c /var/backups/autotest/<fayl>.sql.gz | docker exec -i autotest-db-prod psql -U autotest_prod -d autotest_prod
```

---

## 5. Frontend o'zgargan bo'lsa

```bash
# Build
docker compose --env-file .env.prod -f deploy/docker-compose.yml build frontend

# Restart (faqat frontend, depend bo'lmasin)
docker compose --env-file .env.prod -f deploy/docker-compose.yml up -d --no-deps frontend

# Tekshirish
docker ps --filter "name=autotest-frontend-prod" --format "{{.Names}} {{.Status}}"
docker logs --tail 30 autotest-frontend-prod
curl -s -o /dev/null -w "%{http_code}\n" http://localhost/
```

---

## 6. Nginx config o'zgargan bo'lsa

Container'ni rebuild qilish shart emas — config volume sifatida bog'langan. Faqat reload qilish kifoya:

```bash
# Sintaksisni tekshirish
docker exec autotest-nginx-prod nginx -t

# Reload (downtime'siz)
docker exec autotest-nginx-prod nginx -s reload
```

Agar volume mount o'zgargan bo'lsa (faqat shu holda restart kerak):

```bash
docker compose --env-file .env.prod -f deploy/docker-compose.yml up -d --no-deps nginx
```

---

## 7. Yakuniy tekshiruv (smoke test)

```bash
# 1) Asosiy sahifa
curl -s -o /dev/null -w "Frontend: %{http_code}\n" http://localhost/

# 2) Backend health
curl -s -o /dev/null -w "Auth/me: %{http_code}\n" http://localhost/api/auth/me

# 3) OpenAPI docs
curl -s -o /dev/null -w "OpenAPI: %{http_code}\n" http://localhost/openapi.json

# 4) Login oqimi (test foydalanuvchi bilan)
# REGISTER -> LOGIN -> /me cookie bilan
```

Container holatlari:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

Hammasi `Up ... (healthy)` yoki `Up ...` bo'lishi kerak. Agar `(unhealthy)` ko'rsangiz, `docker logs <container>` orqali sababini topib oling.

---

## 8. Rollback (xato bo'lsa)

### 8.1. Kod xatosi — git'dan oldingi versiyaga qaytish

```bash
# Oxirgi yaxshi commitga qaytish
git reset --hard <oldingi_commit_hash>

# Backend'ni qayta build + tushirish
docker compose --env-file .env.prod -f deploy/docker-compose.yml build backend
docker compose --env-file .env.prod -f deploy/docker-compose.yml up -d --no-deps backend
```

### 8.2. Migratsiya xatosi — bir qadam orqaga

```bash
docker exec autotest-backend-prod alembic downgrade -1
```

### 8.3. To'liq buzilgan bo'lsa — DB backup'dan tiklash

4-bo'limning tiklash bo'limiga qarang. Lekin bunda backup'dan keyingi BARCHA ma'lumotlar yo'qoladi.

---

## 9. Tez-tez uchraydigan muammolar

### "container is unhealthy"
- `docker logs <container>` orqali xatoni topib oling
- Backend healthcheck'i `entrypoint.sh` da; DB esa `pg_isready`
- Ko'pincha sababi: env vars to'g'ri o'rnatilmagan

### "DATABASE_URL ... no such host: db"
- DB container ishlamayapti yoki network buzilgan
- `docker compose --env-file .env.prod -f deploy/docker-compose.yml up -d db` bilan ko'taring

### "401 Unauthorized" /api/auth/me da brauzerdan
- Cookie ham qabul qilingani, lekin yuborilmayotganligini tekshiring (DevTools → Application → Cookies)
- Hozirgi prod HTTP-only ishlaydi; HTTPS yoqilgandan keyin `secure=True` bilan qaytarish kerak (`backend/api/auth/router.py` `_set_auth_cookies`)

### `${DB_USER} is not set` warning
- `--env-file .env.prod` qo'shilmagan. Hech qachon shu warning'ni e'tibordan chetda qoldirmang — compose container'larni noto'g'ri parametrlar bilan qayta yaratishi mumkin

### Disk to'lib qoldi
- Eski Docker image'larni tozalash: `docker image prune -a`
- Eski volume'larni tekshirish: `docker volume ls` va `docker volume prune` (ehtiyot bo'ling — postgres_data ga tegmasin)

---

## 10. Qisqa cheat sheet

```bash
# To'liq oqim — backend yangilandi
cd /var/www/AvtoTest_02
git pull origin clean_architecture
docker compose --env-file .env.prod -f deploy/docker-compose.yml build backend
docker compose --env-file .env.prod -f deploy/docker-compose.yml up -d --no-deps backend
docker logs --tail 20 autotest-backend-prod
curl -s -o /dev/null -w "%{http_code}\n" http://localhost/api/auth/me

# Frontend yangilandi
git pull origin clean_architecture
docker compose --env-file .env.prod -f deploy/docker-compose.yml build frontend
docker compose --env-file .env.prod -f deploy/docker-compose.yml up -d --no-deps frontend

# Faqat nginx config
git pull origin clean_architecture
docker exec autotest-nginx-prod nginx -t && docker exec autotest-nginx-prod nginx -s reload
```

---

## Asosiy qoidalar

1. **Doim `--env-file .env.prod` bilan ishlash** — kompoz buyrug'i shaffof bo'lishi uchun
2. **Doim `--no-deps` ishlatish** — bir servisni yangilab, boshqalariga tegmaslik
3. **DB ga tegishli buyruqlar oldidan backup olish** — `pg_dump` 30 soniya, lekin tiklash 0 daqiqa
4. **Har deploy'dan keyin smoke test** — 4 ta curl, 30 soniya
5. **Logni ko'rish** — `docker logs` har doim birinchi qadam
