# DRAGME — Complete API Reference

This document describes the canonical REST API endpoints for the DRAGME backend platform.

---

## 1. Authentication Endpoints

### `POST /api/auth/register`
Creates a new authenticated user account.
- **Request Body**:
  ```json
  {
    "username": "dragmaster",
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1...",
    "user": {
      "id": "usr_...",
      "username": "dragmaster",
      "email": "user@example.com",
      "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=dragmaster",
      "reputation": 100
    }
  }
  ```

### `POST /api/auth/login`
Authenticates an existing user via email/username and password.
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1...",
    "user": { ... }
  }
  ```

### `GET /api/auth/me`
Returns currently authenticated session user or `null` for guests.
- **Headers**: `Authorization: Bearer <token>` (Optional)
- **Response `200 OK`**:
  ```json
  {
    "user": { ... } | null
  }
  ```

### `GET /api/auth/check-username?username=desired_name`
Checks if a username is available.
- **Response `200 OK`**:
  ```json
  {
    "available": true,
    "username": "desired_name"
  }
  ```

---

## 2. Posts & Feed Endpoints

### `GET /api/posts`
Fetches paginated posts from the community feed.
- **Query Parameters**:
  - `tab`: `for-you` | `roast` | `flame` | `spicy` | `trending` | `room`
  - `room`: (Optional) Room filter (e.g. `tech-beef`, `gaming-rages`)
  - `limit`: Default `20`, max `100`
  - `offset`: Default `0`
- **Response `200 OK`**:
  ```json
  {
    "posts": [
      {
        "id": "post_...",
        "authorId": "usr_...",
        "author": "dragmaster",
        "authorAvatar": "...",
        "content": "Why is JavaScript so weird?",
        "mediaUrl": "/uploads/post_123.webp",
        "mediaType": "image",
        "isAnonymous": false,
        "dragCount": 42,
        "commentsCount": 12,
        "heatLevel": "flame",
        "userVoted": false,
        "createdAt": "2026-10-03T12:00:00.000Z"
      }
    ],
    "hasMore": true
  }
  ```

### `POST /api/posts`
Publishes a new post to the community feed.
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "content": "Roast this architecture diagram!",
    "mediaUrl": "/uploads/image.webp",
    "mediaType": "image",
    "isAnonymous": false,
    "room": "tech-beef"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "post": { ... }
  }
  ```

---

## 3. Reactions & Crown Voting

### `POST /api/posts/:id/vote`
Toggles or upgrades a reaction on a post.
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "reactionType": "crown" | "fire" | "skull" | "clown" | "heart",
    "isSuper": false,
    "switchOnly": false
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "hasVoted": true,
    "reactionType": "crown",
    "isSuper": false,
    "dragCount": 43
  }
  ```

### `GET /api/posts/:id/reactors`
Retrieves list of users who reacted to the post.
- **Response `200 OK`**:
  ```json
  {
    "reactors": [
      {
        "userId": "usr_...",
        "username": "speedy",
        "avatar": "...",
        "reactionType": "crown",
        "isSuper": true
      }
    ],
    "total": 43
  }
  ```

---

## 4. Comments & Threads

### `GET /api/posts/:id/comments`
Fetches comments for a specific post.
- **Response `200 OK`**:
  ```json
  {
    "comments": [
      {
        "id": "cm_...",
        "postId": "post_...",
        "authorId": "usr_...",
        "author": "reviewer",
        "authorAvatar": "...",
        "content": "Looks solid!",
        "createdAt": "2026-10-03T12:05:00.000Z"
      }
    ]
  }
  ```

### `POST /api/posts/:id/comments`
Adds a comment to a post.
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "content": "Here is my roast on this post..."
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "comment": { ... },
    "heatLevel": "spicy"
  }
  ```

---

## 5. User Profiles & Bookmarks

### `GET /api/profile/:username`
Fetches public profile data, user posts, and stats.
- **Response `200 OK`**:
  ```json
  {
    "profile": {
      "id": "usr_...",
      "username": "dragmaster",
      "bio": "Building the future of social apps.",
      "avatar": "...",
      "banner": "...",
      "animatedAvatar": null,
      "animatedBanner": null,
      "reputation": 450,
      "postsCount": 18,
      "isOwner": false
    },
    "posts": [ ... ]
  }
  ```

### `PUT /api/profile/update`
Updates user profile metadata and media assets.
- **Authentication**: Required (Owner)
- **Request Body**:
  ```json
  {
    "bio": "Updated bio text",
    "avatar": "/uploads/avatar.webp",
    "banner": "/uploads/banner.webp"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "user": { ... }
  }
  ```

### `POST /api/posts/:id/save`
Toggles saving/bookmarking a post for the authenticated user.
- **Authentication**: Required
- **Response `200 OK`**:
  ```json
  {
    "saved": true
  }
  ```

---

## 6. Rooms & Topics

### `GET /api/rooms`
Fetches the active community rooms catalog.
- **Response `200 OK`**:
  ```json
  {
    "rooms": [
      {
        "id": "general",
        "name": "General Arena",
        "icon": "🏟️",
        "description": "The open battlefield for everything."
      },
      {
        "id": "tech-beef",
        "name": "Tech Beef",
        "icon": "💻",
        "description": "Tabs vs Spaces, Rust vs C++, Framework Wars."
      }
    ]
  }
  ```
