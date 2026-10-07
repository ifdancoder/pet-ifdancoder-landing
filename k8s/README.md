# Деплой в Kubernetes

Пуш в `main` → GitHub Actions (self-hosted runner прямо на сервере) собирает образ, импортирует его в containerd кластера и накатывает манифесты. Внешний registry не используется — образ никуда не пушится, он просто уже лежит на том же сервере, где крутится кластер.

## Что здесь

- `namespace.yaml` — namespace `landing`, изолирует ресурсы этого сайта от других сайтов на том же кластере. Применяется один раз вручную, не через CI (см. ниже, почему).
- `rbac.yaml` — ServiceAccount `ci-deployer` с правами только внутри namespace `landing`. Тоже применяется один раз вручную — сервисный аккаунт не должен сам себе выдавать права.
- `configmap.yaml` — несекретные переменные окружения приложения.
- `secret.env.example` — список переменных для секрета (`APP_KEY`, `DB_PASSWORD`, `ADMIN_PATH`). Реальные значения живут в GitHub repository secrets, не на сервере и не в репозитории (см. ниже).
- `postgres.yaml` — StatefulSet + headless Service для PostgreSQL с отдельным PVC под данные.
- `pvc.yaml` — PVC для `storage/app/public` (загруженные фото), ReadWriteOnce.
- `deployment.yaml` — Deployment приложения (1 реплика, initContainer прогоняет миграции перед стартом). Тег образа — плейсхолдер `__TAG__`, его подставляет CI.
- `service.yaml` — ClusterIP-сервис приложения.
- `ingress.yaml` — маршрутизация по `ifdancoder.ru` + TLS через cert-manager.

## Системные требования к серверу

Минимум **4 ГБ RAM**. На связке k3s + containerd + Postgres + приложение + ingress-nginx + cert-manager + self-hosted CI-раннер, который во время деплоя ещё и гоняет `docker build`, 1-2 ГБ не хватает — проверено на практике: нода проваливается в `NodeNotReady` под нагрузкой сборки, здоровые поды (в частности ingress-nginx) перезапускаются по ложному таймауту liveness-проверки. `bootstrap.sh` заводит 2 ГБ swap как подушку безопасности, но это не замена нормального объёма RAM, только смягчение.

## Одноразовая настройка свежего сервера

### Автоматически — `k8s/bootstrap.sh`

Ставит k3s (без Traefik, вместо него ingress-nginx), Docker, пользователя `deploy-landing`, клонирует репозиторий, поднимает ingress-nginx + cert-manager + ClusterIssuer, применяет `namespace.yaml` + `rbac.yaml`, настраивает sudoers для импорта образов, генерирует урезанный kubeconfig для `deploy-landing`, печатает готовый `APP_KEY` для GitHub Secrets. Весь скрипт — один процесс bash, поэтому никаких проблем с `export`, не доживающим до другой сессии.

Сначала клонировать репозиторий (разово, под root/sudo-пользователем, у которого есть доступ к GitHub) просто чтобы достать сам скрипт:

```bash
git clone https://github.com/ifdancoder/pet-ifdancoder-landing.git /tmp/landing-bootstrap
sudo bash /tmp/landing-bootstrap/k8s/bootstrap.sh
```

Если репозиторий приватный, подставить URL с токеном или использовать SSH-ключ, которым root уже умеет пользоваться.

После скрипта остаётся только:

1. Скопировать `APP_KEY`, который скрипт напечатал в конце, в GitHub repository secrets (см. раздел «GitHub repository secrets» ниже).
2. Зарегистрировать runner (следующий раздел).

Дальше переходи к «Первый деплой».

### Вручную, шаг за шагом (если `bootstrap.sh` не подошёл или нужно понять, что происходит внутри)

#### 1. k3s

Traefik отключаем — вместо него ставим ingress-nginx, чтобы `ingressClassName: nginx` в `ingress.yaml` совпадал. Kubeconfig оставляем на правах по умолчанию (`600`, только root) — раннер получит отдельный, урезанный, не этот:

```bash
curl -sfL https://get.k3s.io | sh -s - --disable traefik
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
```

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx --create-namespace
helm install cert-manager jetstack/cert-manager -n cert-manager --create-namespace --set installCRDs=true
```

Создать `ClusterIssuer` (`letsencrypt-prod`, как в аннотации `ingress.yaml`) под Let's Encrypt — пример есть в [документации cert-manager](https://cert-manager.io/docs/configuration/acme/).

DNS A-запись `ifdancoder.ru` должна указывать на внешний IP сервера. Порты 80/443 на сам сервер пробрасывает встроенный в k3s ServiceLB (Klipper) — он сам вешается на хост-порты и форвардит на `Service` типа `LoadBalancer`, которым ingress-nginx и ставится по умолчанию. Не переопределяй `controller.hostNetwork`/`controller.kind` — это сталкивает контроллер с ServiceLB за одни и те же хост-порты, и под зависает в `Pending`.

#### 2. Namespace и права для CI (один раз, под админским kubeconfig)

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/rbac.yaml
```

`rbac.yaml` создаёт ServiceAccount `ci-deployer` с правами только на ресурсы внутри `landing` (Deployment, StatefulSet, Service, ConfigMap, Secret, PVC, Ingress) — ни других namespace, ни секретов других сайтов, ни самого кластера он не видит.

#### 3. Docker (для сборки образов)

```bash
curl -fsSL https://get.docker.com | sh
```

#### 4. Отдельный системный пользователь под раннер

Не использовать существующего admin-пользователя — завести отдельного, специально под CI:

```bash
sudo useradd -m -s /bin/bash deploy-landing
sudo usermod -aG docker deploy-landing
```

Членство в группе `docker` — по-прежнему фактически root на хосте (см. обсуждение выше в чате), это неизбежная цена за сборку образов без внешнего registry. Отдельный пользователь не убирает этот риск, но хотя бы не даёт раннеру заодно унаследовать остальные права твоего основного аккаунта на сервере.

Право импортировать образ в containerd — точечно, без пароля:

```bash
echo 'deploy-landing ALL=(root) NOPASSWD: /usr/local/bin/k3s ctr images import -' \
  | sudo tee /etc/sudoers.d/k3s-import
```

#### 5. Урезанный kubeconfig для этого пользователя

```bash
sudo -u deploy-landing mkdir -p /home/deploy-landing/.kube

kubectl -n landing get secret ci-deployer-token -o jsonpath='{.data.token}' \
  | base64 -d | sudo -u deploy-landing tee /home/deploy-landing/.kube/token.txt >/dev/null

kubectl -n landing get secret ci-deployer-token -o jsonpath='{.data.ca\.crt}' \
  | base64 -d | sudo -u deploy-landing tee /home/deploy-landing/.kube/ca.crt >/dev/null

SERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
TOKEN=$(sudo cat /home/deploy-landing/.kube/token.txt)

cat <<EOF | sudo -u deploy-landing tee /home/deploy-landing/.kube/config >/dev/null
apiVersion: v1
kind: Config
clusters:
  - name: k3s
    cluster:
      server: $SERVER
      certificate-authority: /home/deploy-landing/.kube/ca.crt
contexts:
  - name: ci-deployer
    context:
      cluster: k3s
      namespace: landing
      user: ci-deployer
current-context: ci-deployer
users:
  - name: ci-deployer
    user:
      token: $TOKEN
EOF

sudo rm /home/deploy-landing/.kube/token.txt
sudo chmod 600 /home/deploy-landing/.kube/config
sudo chown -R deploy-landing:deploy-landing /home/deploy-landing/.kube
```

Проверить, что доступ реально урезан (из-под `deploy-landing`). `KUBECONFIG` здесь передаётся явно через `env`, а не через `export` — на некоторых системах `sudo -u` всё равно протаскивает переменные окружения вызывающего, и `deploy-landing` получил бы `/etc/rancher/k3s/k3s.yaml` (к которому у него нет прав) вместо своего урезанного файла:

```bash
sudo -u deploy-landing env KUBECONFIG=/home/deploy-landing/.kube/config kubectl get pods -n landing        # работает
sudo -u deploy-landing env KUBECONFIG=/home/deploy-landing/.kube/config kubectl get pods -n kube-system     # Forbidden
sudo -u deploy-landing env KUBECONFIG=/home/deploy-landing/.kube/config kubectl get nodes                   # Forbidden
```

#### 6. GitHub repository secrets

Секреты не живут ни в git, ни на сервере — только в GitHub (Settings репозитория → Secrets and variables → Actions → New repository secret). Завести три:

| Secret        | Как получить                                             |
| ------------- | -------------------------------------------------------- |
| `APP_KEY`     | `php artisan key:generate --show`                        |
| `DB_PASSWORD` | `openssl rand -base64 24`                                |
| `ADMIN_PATH`  | `openssl rand -hex 8` — непредсказуемый путь для админки |

Workflow сам пишет их в `k8s/secret.env` на лету при каждом деплое (шаг «Write production secrets» в `.github/workflows/deploy.yml`) — файл существует только в рабочей копии раннера на время одного запуска job'ы, в логах GitHub маскирует эти значения автоматически.

## GitHub Actions self-hosted runner (нужен в любом случае — и после скрипта, и после ручных шагов)

Зарегистрировать на этот репозиторий (Settings → Actions → Runners → New self-hosted runner — GitHub даст команды `config.sh` с токеном) **от имени `deploy-landing`**, поставить как systemd-сервис:

```bash
sudo -u deploy-landing -i
mkdir ~/actions-runner && cd ~/actions-runner
# команды скачивания и ./config.sh — ровно те, что показал GitHub
exit   # обратно в свою сессию

cd ~deploy-landing/actions-runner
sudo ./svc.sh install deploy-landing
sudo ./svc.sh start
```

Указать сервису раннера, каким kubeconfig пользоваться — в `~deploy-landing/actions-runner/.env`:

```bash
echo "KUBECONFIG=/home/deploy-landing/.kube/config" | sudo -u deploy-landing tee -a ~deploy-landing/actions-runner/.env
sudo ./svc.sh stop && sudo ./svc.sh start
```

## Что делает `.github/workflows/deploy.yml`

На каждый пуш в `main`:

1. `docker build` образа с тегом `landing:<commit-sha>`.
2. `docker save | sudo k3s ctr images import -` — заносит образ прямо в containerd кластера, без registry.
3. Пишет `k8s/secret.env` из GitHub repository secrets (`APP_KEY`, `DB_PASSWORD`, `ADMIN_PATH`).
4. Подставляет `<commit-sha>` вместо `__TAG__` в `k8s/deployment.yaml` — тег меняется каждый раз, поэтому `kubectl apply` реально перекатывает Deployment, а не просто применяет идентичный манифест.
5. `kubectl apply -k k8s/`, затем ждёт `kubectl rollout status`.

## Первый деплой

После одноразовой настройки выше — просто `git push` в `main`. Если нужно прогнать вручную: Actions → `deploy` → Run workflow.

## Несколько сайтов на одном кластере

Каждый сайт — свой namespace, свой workflow и свои GitHub repository secrets (секреты у GitHub привязаны к репозиторию, так что между сайтами они и не пересекаются сами по себе), но один общий Ingress Controller и один общий cert-manager на весь кластер (уже установлены) — ingress-nginx и cert-manager просто обслуживают оба по их собственным `host`.

## Масштабирование

`landing-storage` — ReadWriteOnce, поэтому больше 1 реплики приложения безопасно только после переключения `FILESYSTEM_DISK` на `s3` (переменные `AWS_*` уже поддерживаются в `config/filesystems.php`) — тогда загруженные файлы будут общими для всех реплик, а не на локальном диске одного пода.
