# 🧭 Atlas Kanban

Atlas Kanban is a containerized web application that provides a modern, flexible, and efficient Kanban board interface for managing tasks, workflows, and team projects.  
It is designed to be lightweight, developer-friendly, and easily deployable with Docker.

---

## ⚙️ Prerequisites

Before you begin, ensure that the following tools are installed on your system:

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)
- (Optional) `sudo` privileges if your system requires them

---

## 🔧 Environment Configuration

1. Create a `.env` file in the root directory of the project (if not already present).  
2. Define the necessary environment variables. Example:

   ```bash
   # .env
   PORT=4899
   NODE_ENV=development



## 🚀 Running the Application

sudo docker compose up --build -d

http://localhost:<PORT>

sudo docker compose down



## 📁 Project Structure
atlas-kanban/
├── api                     # NestJs Api Folder (Backend)
├── webapp                  # Angular App Folder (Frontend)
├── Dockerfile              # Docker build instructions
├── docker-compose.yml      # Container orchestration
├── .env                    # Environment configuration file
├── package.json            # Node.js dependencies and scripts
└── README.md               # Project documentation
