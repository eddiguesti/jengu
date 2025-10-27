# Kubernetes Deployment

## Overview

This directory contains Kubernetes manifests for deploying Jengu workers with auto-scaling capabilities.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Kubernetes Cluster                 │
│                                                      │
│  ┌─────────────────┐    ┌─────────────────┐       │
│  │  API Deployment │    │ Redis (Managed) │       │
│  │   (replicas: 3) │◄───┤  (ElastiCache)  │       │
│  └─────────────────┘    └─────────────────┘       │
│                                  │                  │
│         ┌────────────────────────┼──────────┐      │
│         │                        │          │      │
│  ┌──────▼──────┐   ┌─────────▼──────┐  ┌──▼──────────┐
│  │  Enrichment │   │   Competitor   │  │  Analytics  │
│  │   Worker    │   │     Worker     │  │   Worker    │
│  │  (HPA 2-10) │   │   (HPA 1-5)    │  │  (HPA 1-5)  │
│  └─────────────┘   └────────────────┘  └─────────────┘
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Prerequisites

1. **Kubernetes cluster** (v1.21+)
   - Recommendations: EKS, GKE, AKS, or local (minikube, kind)

2. **Prometheus + Prometheus Adapter** (for custom metrics)

   ```bash
   helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
   helm install prometheus prometheus-community/kube-prometheus-stack
   helm install prometheus-adapter prometheus-community/prometheus-adapter
   ```

3. **Metrics Server** (for CPU/memory-based autoscaling)

   ```bash
   kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
   ```

4. **Redis** (managed or in-cluster)
   - AWS ElastiCache, Google Cloud Memorystore, Azure Cache for Redis
   - Or deploy in-cluster: `helm install redis bitnami/redis`

## Deployment Steps

### 1. Create Namespace

```bash
kubectl create namespace jengu
kubectl config set-context --current --namespace=jengu
```

### 2. Create Secrets

```bash
kubectl create secret generic jengu-secrets \
  --from-literal=redis-url='redis://your-redis-url:6379' \
  --from-literal=supabase-url='https://your-project.supabase.co' \
  --from-literal=supabase-service-key='your-service-key' \
  --from-literal=anthropic-api-key='your-anthropic-key' \
  --from-literal=openweather-api-key='your-openweather-key' \
  --from-literal=calendarific-api-key='your-calendarific-key' \
  --from-literal=makcorps-api-key='your-makcorps-key' \
  --from-literal=scraperapi-key='your-scraperapi-key'
```

### 3. Deploy Workers

```bash
# Deploy enrichment worker with HPA
kubectl apply -f enrichment-worker-deployment.yaml

# Deploy competitor worker with HPA
kubectl apply -f competitor-worker-deployment.yaml

# Deploy analytics worker with HPA
kubectl apply -f analytics-worker-deployment.yaml
```

### 4. Verify Deployments

```bash
# Check pods
kubectl get pods -l component=queue-worker

# Check HPA status
kubectl get hpa

# Check worker logs
kubectl logs -f deployment/enrichment-worker
kubectl logs -f deployment/competitor-worker
kubectl logs -f deployment/analytics-worker
```

## Horizontal Pod Autoscaling (HPA)

### Enrichment Worker HPA

**Triggers**:

- Queue depth > 10 jobs (custom metric from Prometheus)
- CPU usage > 70%
- Memory usage > 80%

**Scaling Behavior**:

- Min replicas: 2
- Max replicas: 10
- Scale up: Add 2 pods OR 50% more (whichever is higher)
- Scale down: Remove 1 pod after 5 minutes of low load

### Competitor Worker HPA

**Triggers**:

- Queue depth > 5 jobs
- CPU usage > 70%

**Scaling Behavior**:

- Min replicas: 1
- Max replicas: 5

### Analytics Worker HPA

**Triggers**:

- Queue depth > 10 jobs
- CPU usage > 80%
- Memory usage > 85%

**Scaling Behavior**:

- Min replicas: 1
- Max replicas: 5

## Custom Metrics (Prometheus Adapter)

The HPA uses custom metrics from Prometheus. Configure the Prometheus Adapter to expose BullMQ metrics:

**`prometheus-adapter-values.yaml`**:

```yaml
rules:
  custom:
    - seriesQuery: 'bullmq_queue_waiting_jobs'
      resources:
        overrides:
          namespace:
            resource: namespace
      name:
        matches: '^(.*)$'
        as: 'bullmq_queue_waiting_jobs'
      metricsQuery: 'avg_over_time(bullmq_queue_waiting_jobs{<<.LabelMatchers>>}[2m])'
```

Apply the configuration:

```bash
helm upgrade prometheus-adapter prometheus-community/prometheus-adapter \
  -f prometheus-adapter-values.yaml
```

## Resource Requests & Limits

### Enrichment Worker

- **Requests**: 512Mi RAM, 500m CPU
- **Limits**: 1Gi RAM, 1000m CPU
- **Rationale**: Enrichment is I/O-bound (API calls) but needs headroom for batch processing

### Competitor Worker

- **Requests**: 256Mi RAM, 250m CPU
- **Limits**: 512Mi RAM, 500m CPU
- **Rationale**: Lightweight scraping with rate limiting

### Analytics Worker

- **Requests**: 512Mi RAM, 500m CPU
- **Limits**: 2Gi RAM, 2000m CPU
- **Rationale**: CPU-intensive calculations, may need more memory for large datasets

## Monitoring

### Check HPA Metrics

```bash
# View HPA details
kubectl describe hpa enrichment-worker-hpa

# Watch HPA in real-time
kubectl get hpa -w

# Check metrics server
kubectl top pods
kubectl top nodes
```

### View Queue Metrics (Prometheus)

```promql
# Queue depth
bullmq_queue_waiting_jobs{queue="enrichment"}

# Active jobs
bullmq_queue_active_jobs{queue="enrichment"}

# Job rate
rate(bullmq_queue_completed_jobs{queue="enrichment"}[5m])

# Failure rate
rate(bullmq_queue_failed_jobs{queue="enrichment"}[5m])
```

### Grafana Dashboard

Import the Grafana dashboard:

```bash
kubectl port-forward svc/prometheus-grafana 3000:80
# Visit http://localhost:3000
# Import dashboard: ../docs/monitoring/grafana-queue-dashboard.json
```

## Troubleshooting

### HPA Not Scaling

**Problem**: HPA shows `<unknown>` for custom metrics

**Solution**:

1. Check Prometheus Adapter is running:

   ```bash
   kubectl get pods -n kube-system | grep prometheus-adapter
   ```

2. Check custom metrics API:

   ```bash
   kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1 | jq .
   ```

3. Verify Prometheus is scraping metrics:
   ```promql
   bullmq_queue_waiting_jobs
   ```

### Workers Not Processing Jobs

**Problem**: Jobs stuck in `waiting` state

**Solution**:

1. Check worker logs:

   ```bash
   kubectl logs -f deployment/enrichment-worker
   ```

2. Check Redis connectivity:

   ```bash
   kubectl exec -it deployment/enrichment-worker -- sh
   redis-cli -u $REDIS_URL ping
   ```

3. Verify secrets:
   ```bash
   kubectl get secret jengu-secrets -o yaml
   ```

### Memory Issues

**Problem**: Workers being OOMKilled

**Solution**:

1. Increase memory limits in deployment YAML
2. Reduce worker concurrency:
   ```yaml
   - name: ENRICHMENT_WORKER_CONCURRENCY
     value: '3' # Reduce from 5
   ```

## Cost Optimization

### Development/Staging

Use lower resource requests and limits:

```yaml
resources:
  requests:
    memory: '256Mi'
    cpu: '250m'
  limits:
    memory: '512Mi'
    cpu: '500m'
```

Set lower HPA thresholds:

```yaml
spec:
  minReplicas: 1 # Single replica
  maxReplicas: 3 # Lower max
```

### Production

Use node affinity to place workers on spot/preemptible instances:

```yaml
spec:
  template:
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: node.kubernetes.io/instance-type
                    operator: In
                    values:
                      - t3.medium # AWS spot instances
                      - e2-medium # GCP preemptible
      tolerations:
        - key: 'spot'
          operator: 'Equal'
          value: 'true'
          effect: 'NoSchedule'
```

## Security

### Network Policies

Restrict worker network access:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: worker-network-policy
spec:
  podSelector:
    matchLabels:
      component: queue-worker
  policyTypes:
    - Egress
  egress:
    # Allow Redis
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - protocol: TCP
          port: 6379
    # Allow Supabase
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: TCP
          port: 443
```

### Pod Security Standards

Apply restricted pod security:

```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: worker-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  runAsUser:
    rule: MustRunAsNonRoot
  seLinux:
    rule: RunAsAny
  fsGroup:
    rule: RunAsAny
```

## Rollout Strategy

### Zero-Downtime Deployments

Workers support graceful shutdown (waits for active jobs to complete):

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  template:
    spec:
      terminationGracePeriodSeconds: 300 # 5 minutes for jobs to finish
```

### Blue-Green Deployments

Use separate deployments for testing:

```bash
# Deploy new version as "green"
kubectl apply -f enrichment-worker-deployment-green.yaml

# Test green deployment
kubectl port-forward deployment/enrichment-worker-green 9229:9229

# Switch traffic (update HPA to point to green)
kubectl patch hpa enrichment-worker-hpa -p '{"spec":{"scaleTargetRef":{"name":"enrichment-worker-green"}}}'

# Delete old "blue" deployment
kubectl delete deployment enrichment-worker
```

## Cleanup

```bash
# Delete all workers
kubectl delete -f enrichment-worker-deployment.yaml
kubectl delete -f competitor-worker-deployment.yaml
kubectl delete -f analytics-worker-deployment.yaml

# Delete namespace
kubectl delete namespace jengu
```

---

**Last Updated**: 2025-10-23
