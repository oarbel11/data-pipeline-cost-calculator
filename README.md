# Data Pipeline Cost Calculator

A single-page, no-dependency tool that helps data engineers estimate the cost of a data pipeline and compare options for each layer. You enter daily volume (default 1 TB/day), retention, job counts and similar inputs, then pick an option for each layer. The page shows $/day, $/month, the formula behind each line, and the cheaper alternatives for that line.

Layers: ingestion, streaming, lake storage, processing, scripts/functions, orchestration, warehouse/serving, egress, and monitoring. It covers AWS, GCP, Azure, Databricks, Snowflake, Fivetran, Airbyte, Astronomer and self-hosted options.

## Run
Open `index.html` in a browser. There is no build step.

## Test
```
node test.js
```

## Update prices
All prices are in the `CATALOG` inside `<script id="engine">` in `index.html`. They are US-region on-demand list prices, researched Nov 2026. Options tagged `est.` are low-confidence or contract-dependent. Check the linked vendor pages before you commit a budget.

## Deploy
`.github/workflows/pages.yml` publishes to GitHub Pages on every push to `main`. In the repo, go to Settings → Pages → Source and select "GitHub Actions".
