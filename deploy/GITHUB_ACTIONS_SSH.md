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

Проверка **запускается на вашем ПК** в терминале (PowerShell / Git Bash). В команде **`ВАШ_IP` — это публичный IP сервера (VPS), а не IP вашего компьютера**; пользователь — тот, что в `DEPLOY_USER` (например `deploy`).

```bash
ssh -i ./gha_deploy deploy@ПУБЛИЧНЫЙ_IP_VPS "echo ok"
```

Должно вывести `ok` без пароля.

Приватный ключ `gha_deploy` **никуда в репозиторий не коммитьте**.

---

## Шаг 3. Доступ репозитория на сервере к GitHub

Каталог проекта должен принадлежать пользователю `deploy` (один раз от **root**: `chown -R deploy:deploy /opt/nhatrang-map`). Дальше под `deploy`:

```bash
cd /opt/nhatrang-map
```

Выберите один вариант.

**Вариант A — Deploy key (read-only), рекомендуется**

Это настройки **самого репозитория** (как на скрине с «Deploy keys» слева), не аккаунта.

1. На **сервере** под `deploy`: `ssh-keygen -t ed25519 -C "server-deploy-read" -f ~/.ssh/github_repo -N ""` → публичный ключ `~/.ssh/github_repo.pub`.
2. На GitHub: откройте **репозиторий** → **Settings** → **Deploy keys** → **Add deploy key** → вставьте содержимое `.pub`, имя произвольное, **не** включайте «Allow write access» (нужно только чтение).
3. Проверьте remote: `git remote -v` — для deploy key нужен **SSH**-URL, например `git@github.com:USER/map.git`. Если стоит HTTPS, переключите:  
   `git remote set-url origin git@github.com:USER/map.git`  
4. Первый раз: `ssh -T git@github.com` (ответит про аутентификацию — это нормально). Затем `git fetch origin` без пароля.

**Вариант B — HTTPS + Personal Access Token**

Токен создаётся в **настройках аккаунта**, не репозитория: справа сверху **аватар** → **Settings** (откроется `github.com/settings/...`) → внизу слева **Developer settings** → **Personal access tokens** → **Fine-grained tokens** (предпочтительно) или **Tokens (classic)**.

- **Fine-grained:** выберите репозиторий → **Repository permissions** → **Contents: Read-only**.
- **Classic (приватный репо):** scope **`repo`**.

Дальше на сервере: `git remote set-url origin https://github.com/USER/map.git`, затем `git fetch` — логин GitHub, **пароль = вставленный token** (не пароль от аккаунта). Хранить token в URL репозитория нежелательно; удобнее **Deploy key (вариант A)**.

---

## Шаг 4. Секреты в GitHub

В **том же репозитории на GitHub**, куда вы пушите `master`: **Settings → Secrets and variables → Actions** → вкладка **Secrets** → **New repository secret**.

Имена должны совпасть **буква в букву** (регистр важен): `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH`. Если секретов нет или они в **другом** репозитории / только в **Environment** без привязки к workflow — в логе Deploy будет `missing server host` и пустой `cd`.

| Имя секрета       | Значение |
|-------------------|----------|
| `DEPLOY_HOST`     | IP или домен VPS, например `185.211.170.37` |
| `DEPLOY_USER`     | SSH-пользователь, например `deploy` |
| `DEPLOY_SSH_KEY`  | **Весь** текст приватного ключа `gha_deploy` (включая строки `BEGIN` / `END`) |
| `DEPLOY_PATH`     | Абсолютный путь к клону на сервере, например `/opt/nhatrang-map` |

Если в логах Deploy ошибка про **host key** / fingerprint: на ПК выполните `ssh-keyscan -p 22 ВАШ_IP 2>/dev/null | ssh-keygen -lf -`, создайте секрет `DEPLOY_HOST_FINGERPRINT` со значением `SHA256:...` и в `.github/workflows/deploy.yml` в блок `with:` шага `appleboy/ssh-action` добавьте строку `fingerprint: ${{ secrets.DEPLOY_HOST_FINGERPRINT }}`.

Сохраните каждый секрет отдельно. В **`DEPLOY_SSH_KEY`** не должно быть лишних пробелов в начале/конце и **обязательно полный блок** от `-----BEGIN` до `-----END`.

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
| **Deploy** падает за несколько секунд | Откройте красный запуск **Deploy** → шаг **Deploy over SSH** → текст ошибки. Часто: пустой/неверный `DEPLOY_HOST` или `DEPLOY_PATH`, неверный приватный ключ в `DEPLOY_SSH_KEY`, с VPS **нельзя достучаться с интернета** до порта 22 (фаервол провайдера). В workflow включён **`debug: true`** — в логе больше деталей про SSH. |

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
