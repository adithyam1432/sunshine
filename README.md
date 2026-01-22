# Sunshine Mobile Project

This guide explains how to set up and run the Sunshine Mobile Project locally.

## Prerequisites
- **Node.js**: Ensure Node.js is installed on your system.
- **Git**: For version control.

## Project Structure
- **server**: Node.js + Express backend (Port 3000)
- **client_v2**: React + Vite frontend (Port 5173 usually)

## Setup Steps

### 1. Backend (Server) Setup
The backend connects to the SQLite database and handles API requests.

1.  Open a terminal.
2.  Navigate to the server directory:
    ```bash
    cd server
    ```
3.  Install dependencies:
    ```bash
    npm install
    ```
4.  Start the server:
    ```bash
    node server.js
    ```
    *You should see "Server running on http://localhost:3000"*

### 2. Frontend (Client) Setup
The frontend is the user interface.

1.  Open a **new** terminal (keep the server running).
2.  Navigate to the client directory:
    ```bash
    cd client_v2
    ```
3.  Install dependencies:
    ```bash
    npm install
    ```
4.  Start the development server:
    ```bash
    npm run dev
    ```
5.  Open the link shown in the terminal (usually `http://localhost:5173`) in your browser.

## Troubleshooting
- **Database**: If `inventory.db` is missing, the server might try to create it or fail. Ensure the `server` folder contains the database file or run `node seed.js` (if available checks pass) to populate it.
- **Port Conflicts**: If port 3000 is busy, modify `server/server.js` to use a different port.
