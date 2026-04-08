---
inclusion: fileMatch
fileMatchPattern: '**/databricks/**,**/pipelines/**,**/spark/**'
---

# Databricks Cost Guardrails

Reminders for Phase 2/3 when we move to a paid Databricks tier.

## Before Writing Any Pipeline Code
- [ ] Set cluster auto-termination to 10-15 minutes idle
- [ ] Create a cluster policy restricting instance types to the smallest available (single node, minimal memory)
- [ ] Set a monthly budget cap ($25-50 recommended for a learning project) with email alerts at 50% and 80%
- [ ] Configure a hard spending limit that prevents new cluster launches once the cap is hit

## Pipeline Design
- [ ] Use scheduled jobs instead of interactive clusters for all recurring pipeline runs
- [ ] Jobs auto-terminate after completion — never leave interactive clusters running unattended
- [ ] Since the WWII dataset is finite, pipelines only need to run once (or when new scraped data is added), not on a schedule

## Cloud Provider (AWS/Azure/GCP)
- [ ] Set up billing alerts at the cloud account level as a second safety net
- [ ] S3/object storage for Gold tables is cheap — compute is where the cost lives

## Post-Processing
- Once Bronze → Silver → Gold is fully materialized, shut down all compute
- Gold tables persist in object storage at near-zero cost
- Only spin up compute again if reprocessing or adding new data sources
