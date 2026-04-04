# API Copilot 🚀

### About

API Copilot is an AI-powered OpenAPI documentation viewer and assistant designed to streamline API exploration. It allows developers to upload OpenAPI specifications, visualize them through an interactive Swagger UI, and engage with an AI agent to query endpoints, understand complex logic, and generate integration snippets instantly.

---

### Demo

![API Copilot Demo](https://via.placeholder.com/800x450.png?text=API+Copilot+Demo+GIF+Placeholder)
_AI-powered chat integrated directly with your Swagger documentation._

---

### Tech Stack

- **Frontend**: React 19, Vite, TypeScript, TailwindCSS, Swagger UI React, Lucide Icons.

* **Backend**: Node.js, Express, TypeScript, Google Generative AI (Gemini), Multer.
* **DevOps**: Docker, Docker Compose.

---

### Getting Started

#### 🐳 Using Docker (Recommended)

The easiest way to get started is using Docker Compose.

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/raman-saluja/api-copilot.git
    cd api-copilot
    ```
2.  **Set up environment variables**:
    Create a `.env` file in the `backend` directory:
    ```env
    GOOGLE_API_KEY=your_gemini_api_key_here
    PORT=3000
    ```
3.  **Run with Docker Compose**:

    ```bash
    docker-compose up --build
    ```

    - Frontend: [http://localhost](http://localhost)
    - Backend: [http://localhost:3000](http://localhost:3000)

#### 💻 Manual Installation (Without Docker)

##### 1. Backend Setup

```bash
cd backend
npm install
# Create .env with GOOGLE_API_KEY
npm run dev
```

##### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will typically run on [http://localhost:5173](http://localhost:5173).

---

### How to Contribute

We welcome contributions! To contribute:

1.  **Fork** the project.
2.  **Create** your feature branch (`git checkout -b feature/AmazingFeature`).
3.  **Commit** your changes (`git commit -m 'Add some AmazingFeature'`).
4.  **Push** to the branch (`git push origin feature/AmazingFeature`).
5.  **Open** a Pull Request.

Please ensure your code follows the existing style and includes proper TypeScript types.

---

### License

Distributed under the ISC License.
