# NotionNext on GitHub Pages

This repo now contains a NotionNext project under `notionnext/` and a GitHub Actions workflow that builds a static export and deploys it to the `gh-pages` branch.

## What you need to set on GitHub

1) Repo Secrets
- `Settings -> Secrets and variables -> Actions -> New repository secret`
- Add: `NOTION_PAGE_ID` = your Notion root page/database ID (public page is OK)

2) GitHub Pages
- `Settings -> Pages`
- Source: `Deploy from a branch`
- Branch: `gh-pages`
- Folder: `/(root)`

After the workflow finishes, your site should update within a few minutes.
