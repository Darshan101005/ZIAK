# Ziak Shop — Project Memory

## What this is
- A Shopify theme for the **Ziak** shoe brand, built on the Shopify **Dawn** theme.
- Everything is written in **Liquid** (Shopify's templating language). All new work stays in Liquid file format.
- Store URL: https://dx3njm-rd.myshopify.com  (store handle: `dx3njm-rd`)
- Shopify CLI is installed (v4.4.0). Shell is PowerShell — use `;` as a command separator, not `&&`.

## CRITICAL RULE — Always push to the live theme
- After **every** change or new file creation, push it to the **live** theme. Always.
- Can push the whole theme or only selected files.

### Live theme
- Theme ID: **156907831518** ("Copy of Copy of Dawn 1")
- A `shopify.theme.toml` exists in the repo root defining the `live` environment
  (store `dx3njm-rd.myshopify.com`, theme `156907831518`).

### Push method (confirmed workflow)
- **Run the push SYNCHRONOUSLY** (it takes ~30–60s). Do NOT use background
  process + Start-Sleep polling — that was clunky and caused output-flush issues.
  Just run it with a generous timeout (e.g. 120000 ms) and read the success box.
- Fastest command (uses the toml environment):
  ```powershell
  shopify theme push --environment live --allow-live --only sections/<file>.liquid --only assets/<file>.css
  ```
- Explicit form (always works, no toml needed):
  ```powershell
  shopify theme push --theme 156907831518 --allow-live --only sections/<file>.liquid --only assets/<file>.css
  ```
- `--allow-live` bypasses the live-theme confirmation prompt. `--only` limits to
  changed files (much faster). `--nodelete` is NOT needed.
- Pull remote editor changes before working (avoid overwriting admin edits):
  ```powershell
  shopify theme pull --store dx3njm-rd
  ```
- Note: the CLI may occasionally auto-update itself mid-command, adding ~1 min.
- IMPORTANT push quirks learned:
  - Run the command RAW — do NOT pipe through `Select-Object`/`Out-File`, because
    that buffers/holds the output and hides the streaming progress.
  - The upload can take ~1–3 min, and the CLI process sometimes **lingers after
    printing the success box** (doesn't exit cleanly), which can trip the tool
    timeout. Treat "was pushed successfully" in the output as DONE even if the
    command then reports a timeout. Use a generous timeout (~240000 ms).

## Custom Ziak sections
- Homepage: `ziak-hero`, `ziak-top-picks`, `ziak-top-categories`, `ziak-product-carousel`, `ziak-heritage`, `ziak-why`, `ziak-reviews`, `ziak-footer`
- About page: `ziak-about-hero`, `ziak-about-story`, `ziak-about-values`, `ziak-about-founders-letter`, `ziak-about-stand-for`, `ziak-about-text-overlay`
- Collection: `ziak-collection` (+ template `templates/collection.ziak.json`)

## Theme structure (standard Shopify architecture)
- `/assets` — CSS, JS, images
- `/config` — `settings_schema.json`, `settings_data.json`
- `/layout` — `theme.liquid`, `password.liquid`
- `/locales` — translations
- `/sections` — reusable sections
- `/snippets` — small reusable Liquid partials
- `/templates` — page templates (product, collection, article, etc.)

## Notes
- Prior work was done with Claude Sonnet in Antigravity; additional memory/context can be brought over from there on request.
