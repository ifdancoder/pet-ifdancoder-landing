#!/usr/bin/env bash
# One-shot server bootstrap. Run as root, once, on a fresh VPS:
#
#   sudo bash k8s/bootstrap.sh
#
# Everything here runs inside this single script process, so there is no
# "exported KUBECONFIG in a different shell" problem — every command below
# shares the same environment.
#
# What it does NOT do (needs a human):
#   - fill real values into /opt/landing/secret.env (DB_PASSWORD, ADMIN_PATH)
#   - register the GitHub Actions self-hosted runner (needs a live token
#     from GitHub's UI, see k8s/README.md)
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Запускать от root: sudo bash k8s/bootstrap.sh" >&2
  exit 1
fi

REPO_URL="${REPO_URL:-https://github.com/ifdancoder/pet-ifdancoder-landing.git}"
RUNNER_USER="${RUNNER_USER:-deploy-landing}"
REPO_DIR="/home/${RUNNER_USER}/landing"

echo "==> k3s"
if ! command -v k3s >/dev/null 2>&1; then
  curl -sfL https://get.k3s.io | sh -s - --disable traefik
fi
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
kubectl get nodes

echo "==> Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

echo "==> Пользователь ${RUNNER_USER}"
id -u "$RUNNER_USER" >/dev/null 2>&1 || useradd -m -s /bin/bash "$RUNNER_USER"
usermod -aG docker "$RUNNER_USER"

echo "==> Клонирование репозитория в ${REPO_DIR}"
if [ ! -d "$REPO_DIR/.git" ]; then
  sudo -u "$RUNNER_USER" git clone "$REPO_URL" "$REPO_DIR"
else
  sudo -u "$RUNNER_USER" git -C "$REPO_DIR" pull
fi

echo "==> Helm"
if ! command -v helm >/dev/null 2>&1; then
  curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
fi
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx >/dev/null 2>&1 || true
helm repo add jetstack https://charts.jetstack.io >/dev/null 2>&1 || true
helm repo update

echo "==> ingress-nginx"
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  -n ingress-nginx --create-namespace \
  --set controller.hostNetwork=true \
  --set controller.kind=DaemonSet

echo "==> cert-manager"
helm upgrade --install cert-manager jetstack/cert-manager \
  -n cert-manager --create-namespace \
  --set installCRDs=true

echo "==> ClusterIssuer"
cat <<'EOF' | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: ivanovdancoder@icloud.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            ingressClassName: nginx
EOF

echo "==> namespace + rbac"
kubectl apply -f "$REPO_DIR/k8s/namespace.yaml"
kubectl apply -f "$REPO_DIR/k8s/rbac.yaml"

echo "==> sudoers: импорт образов в containerd без пароля"
echo "${RUNNER_USER} ALL=(root) NOPASSWD: /usr/local/bin/k3s ctr images import -" \
  > /etc/sudoers.d/k3s-import
chmod 440 /etc/sudoers.d/k3s-import

echo "==> урезанный kubeconfig для ${RUNNER_USER}"
sudo -u "$RUNNER_USER" mkdir -p "/home/${RUNNER_USER}/.kube"

kubectl -n landing get secret ci-deployer-token -o jsonpath='{.data.token}' \
  | base64 -d | sudo -u "$RUNNER_USER" tee "/home/${RUNNER_USER}/.kube/token.txt" >/dev/null

kubectl -n landing get secret ci-deployer-token -o jsonpath='{.data.ca\.crt}' \
  | base64 -d | sudo -u "$RUNNER_USER" tee "/home/${RUNNER_USER}/.kube/ca.crt" >/dev/null

SERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
TOKEN=$(cat "/home/${RUNNER_USER}/.kube/token.txt")

cat <<EOF2 | sudo -u "$RUNNER_USER" tee "/home/${RUNNER_USER}/.kube/config" >/dev/null
apiVersion: v1
kind: Config
clusters:
  - name: k3s
    cluster:
      server: ${SERVER}
      certificate-authority: /home/${RUNNER_USER}/.kube/ca.crt
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
      token: ${TOKEN}
EOF2

rm -f "/home/${RUNNER_USER}/.kube/token.txt"
chmod 600 "/home/${RUNNER_USER}/.kube/config"
chown -R "${RUNNER_USER}:${RUNNER_USER}" "/home/${RUNNER_USER}/.kube"

echo "==> проверка прав ${RUNNER_USER} (вторая строка ниже должна быть Forbidden — это ожидаемо)"
# KUBECONFIG передаётся явно, а не через export выше: на некоторых системах
# "sudo -u" всё равно протаскивает переменные окружения вызывающего процесса,
# и deploy-landing получил бы /etc/rancher/k3s/k3s.yaml вместо своего файла.
DEPLOY_KUBECONFIG="/home/${RUNNER_USER}/.kube/config"
sudo -u "$RUNNER_USER" env "KUBECONFIG=${DEPLOY_KUBECONFIG}" kubectl get pods -n landing || true
sudo -u "$RUNNER_USER" env "KUBECONFIG=${DEPLOY_KUBECONFIG}" kubectl get nodes || true

echo "==> секреты приложения"
mkdir -p /opt/landing
if [ ! -f /opt/landing/secret.env ]; then
  cp "$REPO_DIR/k8s/secret.env.example" /opt/landing/secret.env
fi

if grep -q '^APP_KEY=$' /opt/landing/secret.env; then
  echo "==> APP_KEY (одноразовый контейнер, без php на хосте)"
  APP_KEY=$(docker run --rm composer:2 php -r "echo 'base64:'.base64_encode(random_bytes(32));")
  sed -i "s|^APP_KEY=.*|APP_KEY=${APP_KEY}|" /opt/landing/secret.env
fi

chown "${RUNNER_USER}:${RUNNER_USER}" /opt/landing/secret.env
chmod 600 /opt/landing/secret.env

cat <<EOF3

Готово. Осталось руками:
  1. Отредактировать /opt/landing/secret.env — заполнить DB_PASSWORD и ADMIN_PATH
     (APP_KEY уже сгенерирован).
  2. Завести DNS A-запись домена на этот сервер, если ещё не сделано.
  3. Зарегистрировать GitHub Actions self-hosted runner от имени
     "${RUNNER_USER}" (см. k8s/README.md, раздел про runner).
  4. git push origin main — запустит первый деплой.
EOF3
