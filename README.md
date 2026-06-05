# CivicFlow 🏛️

A smart civic complaint management system built to empower citizens and streamline administrative responses.

> **Screenshot:**
> ![CivicFlow Dashboard](/public/screenshot-placeholder.png)
> *(You can upload your website screenshot to the repository and replace the path above!)*

## ✨ Features

- **Automated AI Analysis**: Categorizes, prioritizes, and extracts key issues from citizen complaints using Google Gemini AI.
- **Smart AI De-duplication**: Automatically detects similar or duplicate complaints in the same area and clusters them to reduce administrative spam.
- **Citizen Appeal System**: Citizens can easily appeal rejected complaints by uploading new photo evidence and an appeal message to reopen their case.
- **Real-time Notifications**: Instant alerts and live dashboard broadcasting for new complaints, status updates, and appeals using Socket.io.
- **Interactive Dashboard**: Modern analytics dashboard for administrators to track metrics, map locations, and manage complaint resolutions.
- **Role-based Access Control**: Distinct views, workflows, and capabilities for Citizens vs. Administrators.
- **Location Mapping**: Interactive geolocation mapping for pinning and locating complaints using Photon geocoding and MapLibre.
- **Photo Evidence Management**: Built-in support for capturing, viewing, and managing photographic evidence for complaints.

## 🛠️ Tech Stack (Coding Used)

This project is built using modern web development tools:
- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Database**: Local SQLite Database (`dev.db`) managed by [Prisma ORM](https://www.prisma.io/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **AI Integration**: Google Gemini 1.5 Flash API
- **Real-time Engine**: [Socket.io](https://socket.io/)
- **Charts & Maps**: Recharts, React Map GL

---

## 🚀 Local Deployment Tutorial

Follow these instructions to run CivicFlow on your local machine.

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- npm, yarn, or pnpm
- A Google Gemini API Key

### 1. Navigate to the project directory

Ensure you are in the root directory of the project:
```bash
cd path/to/CivicFlow
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

The project uses a local `.env` file for configuration. Create a `.env` file in the root directory and add the following:

```env
# Local SQLite Database Connection
DATABASE_URL="file:./dev.db"

# NextAuth Configuration
NEXTAUTH_SECRET="your-super-secret-key-change-this"
NEXTAUTH_URL="http://localhost:3000"

# Google Gemini API
GEMINI_API_KEY="your-gemini-api-key"
```

### 4. Setup the Database

Since we are using a local SQLite database, you just need to push the Prisma schema and seed the initial users:

```bash
# Sync the database schema to your local dev.db
npx prisma db push

# Generate Prisma Client
npx prisma generate

# Seed the database with default Admin and Citizen accounts
node prisma/seed.js
```

### 5. Start the Development Server

Run the development server locally:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to use the application!
