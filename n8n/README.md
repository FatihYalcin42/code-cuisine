## n8n Workflows

This folder contains the exported n8n workflow definitions used by Code a Cuisine.

### Included workflow

- `workflows/generate-recipe-v2.json`
  - Handles recipe generation for the app
  - Exposes the production webhook path `/webhook/generate-recipe-v2`
  - Validates user input
  - Enforces the daily quota of 3 successful recipe generations per IP
  - Calls Gemini to generate exactly 3 recipe alternatives
  - Writes quota data to Firestore

### Import into n8n

1. Open n8n.
2. Choose `Import from file`.
3. Select `n8n/workflows/generate-recipe-v2.json`.
4. Reconnect local credentials in n8n.

### Required external credentials

These credentials must be created locally in n8n and are not stored in this repository:

- Google Gemini / PaLM API credential
- Google Cloud Firestore service account credential

### Security note

Do not commit any of the following into the repository:

- Firebase service account JSON files
- API keys or private keys
- n8n credentials exports
- local environment files containing secrets
