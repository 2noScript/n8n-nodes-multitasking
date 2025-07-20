# n8n-nodes-multitasking

Optimize your workflow in n8n — these nodes handle video uploads and validation with seamless drag-and-drop automation.

## Developer Guide

#### 🛠️ Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/2noScript/n8n-nodes-multitasking
   cd n8n-nodes-multitasking
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the node (if applicable):

   ```bash
   npm run build
   ```

4. (Optional) Start in development mode:

   ```bash
   npm run dev
   ```

5. n8n Docker-compose

   ```
   version: "3.9"

   services:
   n8n:
       image: n8nio/n8n:latest
       container_name: n8n
       ports:
       - "5678:5678"
       environment:
       - N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/custom
       - N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true
       - N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true
       volumes:
       - ./n8n_data:/home/node/.n8n
       - {local_path}/n8n-nodes-multitasking:/home/node/.n8n/custom/n8n-nodes-multitasking

   ```

6. Start n8n
   ```bash
   docker compose up -d
   ```
7. Debug custom node
   ```bash
    docker restart n8n
   ```

## Docs

| Node        | Documentation Path                       | Status         | Version |
| ----------- | ---------------------------------------- | -------------- | ------- |
| T2YouTube   | [README.md](nodes/T2YouTube/README.md)   | ✅ Completed   | 1.0.0   |
| T2Facebook  | [README.md](nodes/T2Facebook/README.md)  | ✅ Completed   | 1.0.0   |
| T2Twitter   | [README.md](nodes/T2Twitter/README.md)   | ❌ In Progress | -       |
| T2Instagram | [README.md](nodes/T2Instagram/README.md) | ❌ In Progress | -       |
| T2Telegram  | [README.md](nodes/T2Telegram/README.md)  | ❌ In Progress | -       |
| T2TikTok    | [README.md](nodes/T2TikTok/README.md)    | ❌ In Progress | -       |

## License

[MIT](https://github.com/n8n-io/n8n-nodes-starter/blob/master/LICENSE.md)
