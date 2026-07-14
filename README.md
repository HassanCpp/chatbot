# NovaWear AI Customer Support Engine & RAG Platform

An advanced, production-ready Customer Support AI Assistant platform custom-built for the premium garments brand, **NovaWear**. This system utilizes **Retrieval-Augmented Generation (RAG)** to answer queries grounded in company manuals, alongside **Autonomous Database Tool-Calling** to fetch real-time store inventories, shipping orders, and product details.

---

## ⚙️ Technology Stack

* **Frontend Client**: React (Vite, React Router, Axios, Lucide Icons, Modern Glassmorphism Light Theme).
* **Backend API**: Node.js, Express.js, JWT (JSON Web Tokens), Multer (multi-uploads), Express-Rate-Limit.
* **Databases**:
  * **Primary Store**: MongoDB Atlas (relational-model structures for Customers, Products, Inventory levels, Reviews, and Orders).
  * **Vector Engine**: Qdrant Cloud (vector index collections storing embedded document chunks and product descriptions).
* **AI Models**:
  * **Reasoning Agent**: OpenAI `gpt-4o` (handles dialogue, context reasoning, and database tool executions).
  * **Embeddings**: OpenAI `text-embedding-3-small` (1536-dimensional vectors mapping words and semantic similarities).

---

## 🚀 Key Features

1. **Role-Based Routing (RBAC)**: Protected route layers dynamically steer users to their roles. Standard `"customer"` sessions land in the beauty chatbot, while `"admin"` logins land directly in the Admin Console.
2. **SSE Token Streaming**: Natural, fast responses streamed word-by-word back to the user via Server-Sent Events (SSE) with support for instant client-side cancellation ("Stop Generation").
3. **Multi-Format Document Upload & Vectorization**: Admins can upload up to 30 files concurrently (PDF, DOCX, TXT, MD). Chunks are parsed, embedded using OpenAI, and indexed into Qdrant Cloud.
4. **Active Database Tool Calling**: The AI agent autonomously decides when to trigger DB commands to check stock availability, recommend garments based on budget, or track parcel shipments.
5. **Session History Persistence**: Conversations are saved to MongoDB, allowing customers to easily review and resume past active support chats.

---

## 📂 Project Structure

```text
├── backend/
│   ├── src/
│   │   ├── config/       # MongoDB and Qdrant setup files
│   │   ├── controllers/  # API route action handlers
│   │   ├── middlewares/  # Authentication checks and file filters
│   │   ├── models/       # Mongoose Schemas (User, Product, Order, etc.)
│   │   ├── routes/       # Express endpoint mappings
│   │   ├── services/     # OpenAI API calls and RAG processing
│   │   ├── tools/        # Database function execution tools for GPT-4o
│   │   └── index.js      # Main Express server boot
│   ├── vercel.json       # Backend serverless deployment settings
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── assets/       # Branding assets
│   │   ├── pages/        # Main pages (CustomerChat, AdminDashboard)
│   │   ├── App.jsx       # Top-level React routing and Auth state
│   │   ├── index.css     # Premium styling overrides
│   │   └── main.jsx      # React entrypoint
│   └── package.json
```

---

## 🛠️ Installation & Getting Started

### 1. Prerequisites
Ensure you have the following installed locally:
* **Node.js** (v18+)
* **MongoDB** (Local instance or Atlas Cloud cluster link)
* **Qdrant** (Local docker container or Cloud Cluster API credentials)
* **OpenAI API Key**

---

### 2. Backend Setup
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend/` directory and configure the variables:
   ```env
   PORT=5000
   MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/novawear
   OPENAI_API_KEY=your-openai-api-key
   OPENAI_EMBEDDING_MODEL=text-embedding-3-small
   OPENAI_CHAT_MODEL=gpt-4o
   QDRANT_URL=https://your-qdrant-cluster.io
   QDRANT_API_KEY=your-qdrant-api-key
   JWT_SECRET=your-signed-session-secret-key
   ```
4. Start the backend development server:
   ```bash
   npm run dev
   ```

*Note: The server will automatically connect to MongoDB, verify the Qdrant connection, and initialize collections.*

---

### 3. Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `frontend/` directory:
   ```env
   VITE_API_BASE=http://localhost:5000/api
   ```
4. Start the Vite React development server:
   ```bash
   npm run dev
   ```
5. Open your browser and go to `http://localhost:5173`.

---

## ⚡ Enforcing Single Admin Credentials
To clean up database role authorizations and establish `hassanwaqar475@gmail.com` as the sole administrator:
1. Run the admin authorization utility inside the backend:
   ```bash
   node src/utils/enforce_single_admin.js
   ```

---

## 🚀 Production Deployment on Vercel
Due to the monorepo structure, deploy the backend and frontend as **two separate projects** in Vercel:

1. **Deploy Backend**:
   * Root Directory: `backend`
   * Framework: Node.js / Other
   * Environment Variables: `MONGODB_URI`, `OPENAI_API_KEY`, `QDRANT_URL`, `QDRANT_API_KEY`, `JWT_SECRET`.
2. **Deploy Frontend**:
   * Root Directory: `frontend`
   * Framework: Vite
   * Environment Variables: `VITE_API_BASE` (pointing to your deployed backend URL: `https://<your-backend>.vercel.app/api`).
