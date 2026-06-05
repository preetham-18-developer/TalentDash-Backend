# TalentDash Backend Upgrades Integration & Verification Guide

This document provides a comprehensive guide on the new features added to the **TalentDash Backend**, how to set up the environment, how to run automated verification tests, and how to test and verify every new API endpoint.

---

## 🌟 Feature Overview

### 1. Jobs Module
A complete job board system supporting:
*   **Public Search & Pagination**: Querying jobs by search query (`title`, `description`, `skills`), location filters (`city`, `country`), remote-status, experience, salary ranges, and job type.
*   **Access Control**: Strict role checks requiring `EMPLOYER` or `ADMIN` roles for creating and deleting jobs.
*   **Soft Deletes**: Active jobs are returned by default; deleting a job flags `deleted_at` in the database without destroying records.

### 2. Community & Forum Module
A discussion board supporting:
*   **Category & Tag Filtering**: Posts can be organized by categories (e.g., "Tech Discussion") and tags.
*   **Page Views & Upvotes**: Tracks interactions and engagements on posts.
*   **Nested Commenting**: Interactive commenting threads linked directly to discussion posts.

### 3. Saved Items (Bookmarks) Module
A unified polymorphic bookmarking engine:
*   Users can bookmark **salaries**, **companies**, **reviews**, **jobs**, or **interviews**.
*   The system performs dynamic eager-loading resolver mappings to output the nested details of the saved item (e.g. name of company, base salary details) in a single request.
*   Enforces unique constraint validation to prevent duplicate bookmarks.

### 4. Redis Caching & BullMQ Queues
*   **Resilient Caching**: Company detail lookups and levels comparison grids are cached automatically.
*   **Auto In-Memory Fallback**: If Redis is offline, the application falls back to an in-memory `Map` cache automatically, preventing application crashes.
*   **Queue Management**: BullMQ handles background queue processing (e.g. `test-job`, `process-skills`).

---

## ⚙️ Environment Setup & Run

### 1. Install Dependencies
Install the newly integrated packages (`@nestjs/bullmq`, `bullmq`, `ioredis`):
```bash
npm install
```

### 2. Sync Database Schema
Generate the updated Prisma client with the new models:
```bash
npx prisma generate
```

### 3. Start NestJS Dev Server
```bash
npm run start:dev
```
*   **API Base URL**: `http://localhost:3001/v1`
*   **Interactive Swagger Documentation**: `http://localhost:3001/docs`

---

## 🧪 Automated Testing
We have created 18 integration E2E tests mapping all edge cases, validations, and caching hooks. To run them sequentially:
```bash
npx jest --config ./test/jest-e2e.json test/upgrades.e2e-spec.ts -i --no-cache --forceExit
```

---

## 🛣️ API Endpoints & Route Verification

You can test these routes via the **Swagger UI (`/docs`)** or via tools like Postman/cURL. Note: Protected routes require a Bearer token in the `Authorization` header (`Bearer <token>`).

### 💼 Jobs Module

#### 1. List Jobs (Public)
*   **Method / URL**: `GET /v1/jobs`
*   **Query Parameters** (Optional):
    *   `search` (e.g., `NestJS`)
    *   `city` (e.g., `Bengaluru`)
    *   `is_remote` (e.g., `true`)
    *   `job_type` (e.g., `FULL_TIME`)
    *   `page` (default `1`), `limit` (default `20`)
*   **How to Verify**: Send a GET request. It should return a list of non-deleted jobs with pagination metadata (`meta`).

#### 2. Get Job Details (Public)
*   **Method / URL**: `GET /v1/jobs/:id`
*   **How to Verify**: Send a GET request with a valid job UUID. It returns the job details along with the associated company profile.

#### 3. Create a Job (Protected - Employer/Admin only)
*   **Method / URL**: `POST /v1/jobs`
*   **Payload Format**:
    ```json
    {
      "company_id": "YOUR_COMPANY_UUID",
      "title": "Senior NestJS Developer",
      "description": "Scale our career intelligence engines.",
      "city": "Bengaluru",
      "country": "India",
      "is_remote": true,
      "job_type": "FULL_TIME",
      "experience_min": 5,
      "experience_max": 10,
      "salary_min": 2400000,
      "salary_max": 3600000,
      "skills": ["TypeScript", "NestJS", "Redis"],
      "apply_url": "https://careers.google.com/jobs/nestjs"
    }
    ```
*   **How to Verify**: Login as an Admin or Employer, send the POST request with the bearer token. Should return `201 Created` with the job ID.

#### 4. Delete Job (Protected - Employer/Admin only)
*   **Method / URL**: `DELETE /v1/jobs/:id`
*   **How to Verify**: Send a DELETE request with a valid job UUID. It returns `200 OK` and flags `deleted_at`. Any subsequent GET requests for that job ID will return `404 Not Found`.

---

### 💬 Community & Forum Module

#### 1. Create Post / Discussion (Protected)
*   **Method / URL**: `POST /v1/posts`
*   **Payload Format**:
    ```json
    {
      "category": "Tech Discussion",
      "title": "Why choose NestJS over Express?",
      "body": "NestJS provides modularity out-of-the-box.",
      "tags": ["nestjs", "backend"]
    }
    ```
*   **How to Verify**: Send a POST request authenticated as any logged-in user. Returns `201 Created` with view and upvote counts initialized to 0.

#### 2. List & Filter Posts (Public)
*   **Method / URL**: `GET /v1/posts`
*   **Query Parameters** (Optional): `category`, `tag`, `page`, `limit`
*   **How to Verify**: Send a GET request to return a paginated list of posts.

#### 3. Get Post Details (Public)
*   **Method / URL**: `GET /v1/posts/:id`
*   **How to Verify**: Send a GET request. It increments the `views` counter in the database by 1 and returns the post details along with its associated comment thread.

#### 4. Upvote a Post (Protected)
*   **Method / URL**: `POST /v1/posts/:id/upvote`
*   **How to Verify**: Send an authenticated POST request. It increments the `upvotes` counter by 1.

#### 5. Comment on Post (Protected)
*   **Method / URL**: `POST /v1/posts/:id/comments`
*   **Payload Format**:
    ```json
    {
      "body": "I agree! Modular design is amazing."
    }
    ```
*   **How to Verify**: Send a POST request authenticated. It adds a comment linked to the post.

#### 6. Delete Post (Protected - Author only)
*   **Method / URL**: `DELETE /v1/posts/:id`
*   **How to Verify**: Send a DELETE request. If you are the author of the post, it will delete it and return `200 OK`.

---

### 🔖 Saved Items (Bookmarks) Module

#### 1. Save / Bookmark Item (Protected)
*   **Method / URL**: `POST /v1/saved-items`
*   **Payload Format**:
    ```json
    {
      "item_type": "company", 
      "item_id": "VALID_COMPANY_UUID"
    }
    ```
    *(Note: `item_type` must be one of: `salary`, `company`, `review`, `job`, `interview`)*
*   **How to Verify**: Send a POST request. It checks if the item exists and is not deleted, then creates a bookmark.

#### 2. Get All Saved Bookmarks (Protected)
*   **Method / URL**: `GET /v1/saved-items`
*   **How to Verify**: Send a GET request. It returns all saved items for the user, with a dynamically resolved `details` object containing metadata like company name, job title, etc.

#### 3. Unsave / Remove Bookmark (Protected)
*   **Method / URL**: `DELETE /v1/saved-items/:id`
*   **How to Verify**: Send a DELETE request with the bookmark's unique ID. It deletes the bookmark and returns `200 OK`.
