# Автодеплой через GitHub Actions + SSH (для новичка)

После настройки: **пуш в `master` → проходит CI → на VPS по SSH выполняется `git pull` + пересборка Docker**.

Файл workflow: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

---

## Что должно быть заранее

1. **VPS** с установленными **Docker** и **Docker Compose** (плагин `docker compose`).
2. На сервере **клон репозитория** в фиксированную папку, например `/opt/nhatrang-map`.
3. В этой папке лежит **`.env`** с production-переменными (как в README), рядом **`compose.yaml`**.
4. Репозиторий на GitHub — **ваш** (секреты Actions не передаются в форки от чужих PR).

---

## Шаг 1. Пользователь на сервере для деплоя

Не деплойте от `root`, если можно избежать: заведите пользователя, например `deploy`.

На сервере:

```bash
sudo adduser deploy
sudo usermod -aG docker deploy
```

Пользователь `deploy` должен иметь право:

- `cd` в каталог проекта;
- `git fetch` / `git reset` (читать репозиторий);
- `docker compose build` и `docker compose up` (через группу `docker`).

Проверка:

```bash
sudo su - deploy
cd /opt/nhatrang-map   # ваш путь
docker compose ps
```

---

## Шаг 2. SSH-ключ только для GitHub Actions

На **своём компьютере** (не на сервере), в пустой папке или в `~/.ssh`:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ./gha_deploy -N ""
```

Получатся два файла:

- `gha_deploy` — **приватный** ключ (его положим в GitHub Secrets).
- `gha_deploy.pub` — **публичный** (одна строка — на сервер).

На **сервере**, под пользователем `deploy`:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
```

В конец файла вставьте **содержимое** `gha_deploy.pub` (одна строка). Сохраните.

Права:

```bash
chmod 600 ~/.ssh/authorized_keys
```

Проверка с **вашего ПК** (подставьте IP и пользователя):

```bash
ssh -i ./gha_deploy deploy@ВАШ_IP "echo ok"
```

Должно вывести `ok` без пароля.

Приватный ключ `gha_deploy` **никуда в репозиторий не коммитьте**.

---

## Шаг 3. Доступ репозитория на сервере к GitHub

В каталоге проекта на сервере:

```bash
cd /opt/nhatrang-map
sudo chown -R deploy:deploy .
```

Дальше один из вариантов.

**Вариант A — HTTPS + Personal Access Token (проще для новичка)**

1. На GitHub: **Settings → Developer settings → Personal access tokens** — создайте token с правом **read** на репозиторий (достаточно `Contents: Read` для публичного клона, для приватного — `repo`).
2. На сервере под `deploy`:

   ```bash
   git remote -v
   ```

   Если remote по SSH, можно переключить на HTTPS:

   ```bash
   git remote set-url origin https://github.com/ВАШ_ЛОГИН/map.git
   ```

3. Первый `git fetch` попросит логин/пароль: логин — ваш GitHub username, пароль — **token**. Либо настройте credential helper / сохраните URL с token (менее безопасно; лучше deploy key).

**Вариант B — Deploy key (read-only), рекомендуется**

1. На сервере: `ssh-keygen ...` → публичный ключ добавить в репозиторий: **Settings → Deploy keys → Add** (только чтение).
2. `origin` оставить по SSH: `git@github.com:.../map.git`.

Тогда `git fetch` на сервере не требует пароля.

---

## Шаг 4. Секреты в GitHub

Репозиторий → **Settings → Secrets and variables → Actions → New repository secret**.

| Имя секрета       | Значение |
|-------------------|----------|
| `DEPLOY_HOST`     | IP или домен VPS, например `185.211.170.37` |
| `DEPLOY_USER`     | SSH-пользователь, например `deploy` |
| `DEPLOY_SSH_KEY`  | **Весь** текст приватного ключа `gha_deploy` (включая строки `BEGIN` / `END`) |
| `DEPLOY_PATH`     | Абсолютный путь к клону на сервере, например `/opt/nhatrang-map` |

Сохраните каждый секрет отдельно.

---

## Шаг 5. Как это работает

1. Вы пушите в **`master`**.
2. Запускается workflow **CI** (тесты, сборка).
3. Если CI **успешен**, запускается **Deploy**.
4. GitHub подключается по SSH и выполняет:

   - `git fetch` + `git reset --hard origin/master`;
   - `docker compose build` с аргументом `RELEASE` = короткий хеш коммита;
   - `docker compose up -d`.

Если CI упал, деплой **не** стартует.

---

## Частые проблемы

| Симптом | Что проверить |
|--------|----------------|
| `Permission denied (publickey)` | Публичный ключ в `authorized_keys` того пользователя, что в `DEPLOY_USER`; права `700` на `.ssh`, `600` на `authorized_keys`. |
| `git fetch` fails | Remote `origin`, deploy key / token, владелец файлов в каталоге репо. |
| `docker: permission denied` | Пользователь в группе `docker`, перелогиниться. |
| Долгий таймаут при build | На слабом VPS нормально; в workflow стоит `command_timeout: 30m`. |
| Первый деплой не сработал | Убедитесь, что push был именно в **`master`** и workflow **CI** называется ровно `CI` (как в `.github/workflows/ci.yml`). |

---

## Безопасность (кратко)

- Ключ из шага 2 используйте **только** для этого деплоя.
- Не храните приватный ключ в репозитории и не шлите в чаты.
- На сервере не правьте код руками: всё через `git`; иначе `git reset --hard` затрёт изменения.

---

## Ручной деплой (если Actions отключили)

На сервере:

```bash
cd /opt/nhatrang-map
git pull origin master
docker compose build --build-arg "RELEASE=$(git rev-parse --short HEAD)" app
docker compose up -d
```
