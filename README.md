# WooCommerce to Shopify Migration Tool

This is a full-stack tool built to migrate products from WooCommerce to Shopify via APIs. It includes a sleek, modern React frontend and a robust Node.js Express backend.

## Requirements
- Node.js (v16+)
- npm

## Setup & Running

### 1. Start the Backend
Open a terminal and navigate to the `backend` folder:
```bash
cd backend
npm install
npm start
```
*Note: Use `node index.js` if you don't have a start script.*
The backend will run on `http://localhost:3000`.

### 2. Start the Frontend
Open a new terminal and navigate to the `frontend` folder:
```bash
cd frontend
npm install
npm run dev
```
The frontend will start a development server (usually on `http://localhost:5173`).

---

## Features Implemented
- **Modern UI/UX:** Clean, premium aesthetic built with vanilla CSS.
- **Robust API Backend:** Connects to WooCommerce API (via Basic Auth) and Shopify Admin API.
- **Data Transformation:** Maps titles, descriptions, prices, images, product types, and tags automatically.
- **Rate-Limit Handling:** Enforces a controlled delay (550ms) between Shopify POST requests to prevent `429 Too Many Requests` errors.
- **Graceful Error Handling:** If a product fails, the script safely logs the error, increments the failure count, and continues migrating the rest.
- **Real-time Feedback:** Shows migration progress directly in the UI.
