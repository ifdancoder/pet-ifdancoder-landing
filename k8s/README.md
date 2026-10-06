# Деплой в Kubernetes

Пуш в `main` → GitHub Actions (self-hosted runner прямо на сервере) собирает образ, импортирует его в containerd кластера и накатывает манифесты. Внешний registry не используется — образ никуда не пушится, он просто уже лежит на том же сервере, где крутится кластер.

## Что здесь

- `namespace.yaml` — namespace `landing`, изолирует ресурсы этого сайта от других сайтов на том же кластере. Применяется один раз вручную, не через CI (см. ниже, почему).
- `rbac.yaml` — ServiceAccount `ci-deployer` с правами только внутри namespace `landing`. Тоже применяется один раз вручную — сервисный аккаунт не должен сам себе выдавать права.
- `configmap.yaml` — несекретные переменные окружения приложения.
- `secret.env.example` — список переменных для секрета (`APP_KEY`, `DB_PASSWORD`, `ADMIN_PATH`). На сервере реальные значения лежат вне репозитория, в `/opt/landing/secret.env` (см. ниже).
- `postgres.yaml` — StatefulSet + headless Service для PostgreSQL с отдельным PVC под данные.
- `pvc.yaml` — PVC для `storage/app/public` (загруженные фото), ReadWriteOnce.
- `deployment.yaml` — Deployment приложения (1 реплика, initContainer прогоняет миграции перед стартом). Тег образа — плейсхолдер `__TAG__`, его подставляет CI.
- `service.yaml` — ClusterIP-сервис приложения.
- `ingress.yaml` — маршрутизация по `ifdancoder.ru` + TLS через cert-manager.

## Одноразовая настройка свежего сервера

### 1. k3s

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

DNS A-запись `ifdancoder.ru` должна указывать на внешний IP сервера (ingress-nginx слушает `hostPort`/`hostNetwork` или получает `LoadBalancer`/`NodePort` в зависимости от настроек — на одиночном VPS обычно проще `hostNetwork: true` в values чарта).

### 2. Namespace и права для CI (один раз, под админским kubeconfig)

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/rbac.yaml
```

`rbac.yaml` создаёт ServiceAccount `ci-deployer` с правами только на ресурсы внутри `landing` (Deployment, StatefulSet, Service, ConfigMap, Secret, PVC, Ingress) — ни других namespace, ни секретов других сайтов, ни самого кластера он не видит.

### 3. Docker (для сборки образов)

```bash
curl -fsSL https://get.docker.com | sh
```

### 4. Отдельный системный пользователь под раннер

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

### 5. Урезанный kubeconfig для этого пользователя

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

Проверить, что доступ реально урезан (из-под `deploy-landing`):

```bash
sudo -u deploy-landing kubectl get pods -n landing        # работает
sudo -u deploy-landing kubectl get pods -n kube-system     # Forbidden
sudo -u deploy-landing kubectl get nodes                   # Forbidden
```

### 6. GitHub Actions self-hosted runner

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

### 7. Продакшен-секреты

Секреты не живут в git и не живут даже в рабочей копии репозитория на раннере — только в `/opt/landing/secret.env`, который workflow копирует в `k8s/secret.env` на каждом деплое:

```bash
sudo mkdir -p /opt/landing
sudo cp k8s/secret.env.example /opt/landing/secret.env
sudo $EDITOR /opt/landing/secret.env   # APP_KEY, DB_PASSWORD, ADMIN_PATH
sudo chown deploy-landing:deploy-landing /opt/landing/secret.env
sudo chmod 600 /opt/landing/secret.env
```

Владелец и права — именно `deploy-landing`, под которым работает раннер и который этот файл читает на каждом деплое; больше никому в системе доступ не нужен.

`APP_KEY` сгенерировать через `php artisan key:generate --show`.

## Что делает `.github/workflows/deploy.yml`

На каждый пуш в `main`:

1. `docker build` образа с тегом `landing:<commit-sha>`.
2. `docker save | sudo k3s ctr images import -` — заносит образ прямо в containerd кластера, без registry.
3. Копирует `/opt/landing/secret.env` в `k8s/secret.env`.
4. Подставляет `<commit-sha>` вместо `__TAG__` в `k8s/deployment.yaml` — тег меняется каждый раз, поэтому `kubectl apply` реально перекатывает Deployment, а не просто применяет идентичный манифест.
5. `kubectl apply -k k8s/`, затем ждёт `kubectl rollout status`.

## Первый деплой

После одноразовой настройки выше — просто `git push` в `main`. Если нужно прогнать вручную: Actions → `deploy` → Run workflow.

## Несколько сайтов на одном кластере

Каждый сайт — свой namespace и свой `Ingress` со своим `host`, но один общий Ingress Controller и один общий cert-manager на весь кластер (уже установлены). У другого сайта будет свой namespace, свой workflow и свой `/opt/<site>/secret.env` — ingress-nginx и cert-manager просто обслуживают оба по их собственным `host`.

## Масштабирование

`landing-storage` — ReadWriteOnce, поэтому больше 1 реплики приложения безопасно только после переключения `FILESYSTEM_DISK` на `s3` (переменные `AWS_*` уже поддерживаются в `config/filesystems.php`) — тогда загруженные файлы будут общими для всех реплик, а не на локальном диске одного пода.
