[![GitHub](https://custom-icon-badges.demolab.com/badge/WFAS-blue?logo=wfas&style=for-the-badge)](https://github.com/soamn/wfas)
[![GitHub](https://custom-icon-badges.demolab.com/badge/WFAS-Server-blue?logo=wfas&style=for-the-badge)](https://github.com/soamn/wfas-server)
[![GitHub](https://custom-icon-badges.demolab.com/badge/WFAS-UI-blue?logo=wfas-ui&style=for-the-badge)](https://github.com/soamn/wfas-ui)
![GitHub License](https://img.shields.io/github/license/soamn/wfas-engine?style=for-the-badge&labelColor=yellow&link=https%3A%2F%2Fgithub.com%2Fsoamn%2Fwfas-engine%3Ftab%3DGPL-3.0-1-ov-file)
![GitHub Tag](https://img.shields.io/github/v/tag/soamn/wfas-engine)
![GitHub Repo stars](https://img.shields.io/github/stars/soamn/wfas-engine)

# WFAS Engine 🚀

### Workflow Automation System Engine

WFAS engine is a node-based automation engine designed to execute complex Workflow Nodes. Each Node has its executor that executes and then syncs its results with wfas-server. It runs scheduled workflows by pulling the data from the server , executing and then frees the memory.

---

## ⚙️ How the Engine Works

### System Architecture Flow

```mermaid
flowchart TD
    Ui[WFAS Ui]

    subgraph Cloud ["WFAS Infrastructure"]
        Server[(WFAS Server or Database)]
    end

    subgraph Engine ["WFAS Engine Instance"]
        Executor[Node Executor]
        Memory[In-Memory Results]
    end

    Ui --> Server
    Server -- "1. Pull Data" --> Executor
    Executor -- "2. Node Processing" --> Memory
    Memory -- "3. Sync Results" --> Server
    Memory --> Engine

    %% Grouped styling
    style Cloud rx:15,ry:15,fill:#18181B,stroke:#34d399,stroke-width:2px,color:#fff
    style Engine rx:15,ry:15,fill:#18181B,stroke:#005c81,stroke-width:4px,color:#fff


```

---

### Executor Working

```mermaid
flowchart LR
    subgraph Container ["Engine Executor"]
        executor[Node Executor]
    end

    executor <--> Trigger["Manual Trigger"]
    Trigger -- or --> Webhook["Webhook (e.g. Telegram)"]
    Trigger <-- or --> Schedule[Scheduled Job]
    executor <--> Set["Set Node "]
    executor <--> Action["API Action Node"]
    executor <--> ManualAPI["Manual API Node"]
    executor <--> Filter["Filter Node"]
    executor <--> Delay["Delay Node"]
    executor <--> Chat["Open Router"]
    executor <--> Transform["Transform Node"]
    executor <--> Extract["Extract Node"]
    executor <--> Condition["Condition Node"]
    executor <--> Switch["Switch Node"]
    executor <--> Loop["Loop Node"]
    executor <--> Fail["Fail Node"]

    %% Define Style
    classDef wfasStyle rx:15,ry:15,fill:#18181B,stroke:#fff,color:#fff

    %% Apply Style (No trailing comma)
    class Trigger,Set,Webhook,Action,Schedule,ManualAPI,Filter,Delay,Chat,Transform,Extract,Condition,Switch,Loop,Fail,executor wfasStyle

    %% Subgraph Styling
    style Container rx:15,ry:15,fill:#18181B,stroke:#34d3d9,stroke-width:2px,color:#fff

```

---

## Local Setup

To Run You would need wfas-server and wfas-ui setup as well.

```
cp .env.example .env

pnpm install

pnpm run prisma:generate

pnpm run build

pnpm run start

```
