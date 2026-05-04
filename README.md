<p align="center">
  <img width="2542" height="726" alt="logo_floora" src="https://github.com/user-attachments/assets/f65d1b37-4b80-4059-8c8b-fed86b7e77bf" />
</p>

<h2 align="center">
  A digital platform for delivering personalized pelvic health exercise programs.
</h2>

## 🩺 Project Overview  
Floora, founded by Dr. Loretta Barry, is a pelvic health practice dedicated to helping pregnant and postpartum women regain strength, confidence, and comfort through evidence-based physical therapy.

To enhance the quality and consistency of client care, this project is developing the Floora HEP digital platform, which includes a client mobile application (iOS & Android) and an admin dashboard website. The platform provides an integrated system for managing exercises, tracking progress, and improving communication between clients and practitioners, reflecting Floora’s premium standard of care.

---

## ⚙️ Problem Statement  
Floora currently relies on handwritten exercise instructions, leading to inefficiency, fragmented communication, and limited scalability. This manual approach does not reflect the practice’s modern, high-quality service model.  

A secure and user-friendly digital solution is being developed to streamline exercise management, centralize client data, and enhance the overall client experience. The dedicated web and mobile platform aims to modernize operations, improve accessibility, and support Floora’s mission to deliver professional, seamless pelvic health care.

---

## 🎯 Objective  
The objective is to replace Floora’s manual exercise workflow with a scalable digital system.

The system will:  
- Improve efficiency, consistency, and personalization in delivering home exercise programs (HEP)  
- Enhance client experience with access to exercises, progress tracking, and communication  
- Empower Floora’s staff to manage clients, update content, and monitor outcomes in real time  

---

## 💻 Proposed Solution  
The proposed solution is a custom-built digital platform consisting of:  

- Mobile App for clients: secure access to personalized programs, videos, and progress tracking  
- Admin Dashboard for staff: manage accounts, curate and assign exercises, and track outcomes  

Together, these tools create an integrated, efficient ecosystem that supports Floora’s mission of empowering women with accessible, high-quality pelvic health care.

---

## 🌟 Expected Outcome  
The implementation of the Floora HEP digital platform will:  
- Streamline operations and reduce admin workload  
- Provide clients with a modern, seamless interface  
- Improve program accuracy, engagement, and adherence  
- Enhance scalability while maintaining Floora’s premium care standard  

Overall, this solution will strengthen Floora’s brand as a leader in evidence-based pelvic health care.

---

## 🖥️ Tech Stack  

### Frontend  
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-61DAFB?style=flat&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-38BDF8?style=flat&logo=tailwindcss&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-000020?style=flat&logo=expo&logoColor=white)

### Backend & Database  
![Node.js](https://img.shields.io/badge/Node.js-68A063?style=flat&logo=node.js&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat&logo=supabase&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=flat&logo=postgresql&logoColor=white)
![PLpgSQL](https://img.shields.io/badge/PLpgSQL-0064a5?style=flat&logo=postgresql&logoColor=white)

### Architecture & Hosting  
![Serverless](https://img.shields.io/badge/Serverless-FF4F00?style=flat&logo=serverless&logoColor=white)
![API Driven](https://img.shields.io/badge/API_Driven-6B7280?style=flat)
![AWS](https://img.shields.io/badge/AWS-FF9900?style=flat&logo=amazonaws&logoColor=black)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)

---

## 🎥 Demos 

<p align="center">
  <img src="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGRkdHd4dmk3NXNsczZseHg3aGs3YnZnY2o3Z24wb2p1b29uNzBjZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/1sosTG72VQeXW675ZL/giphy.gif" alt="Appdemo" width="200" />
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <img src="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExcjFwdHM2M3YyenpvcXYyZG9vcWNsMTZkbndzeHIwOG1xZzZrejJjaCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/cntDWPVfH61UKif0p3/giphy.gif" alt="web-demo" width="500" />
</p>

---

## Figma Wireframe  
<img width="1252" height="625" alt="wireframe_floora" src="https://github.com/user-attachments/assets/ea9731de-6abf-4186-ad2e-cb5b0acb87b8" />

---

## Entity Relationship Diagram (ERD)  
<p align="center">
  <img alt="ERD" src="https://github.com/user-attachments/assets/f6117ca5-6385-46b5-a4a2-dd2993496e4c" style="width:50%; height:auto;" />
</p>

---

## 🧪 Testing (To Be Completed in CSC 191)
Testing procedures and unit test coverage will be developed in CSC 191.  

---
## 🌐 Live Application

- Frontend: https://floora-hep.vercel.app  
- Backend API: https://floora-hep-322z.vercel.app

---
## 🚀 Deployment

### Overview

Floora uses a modern full-stack architecture with separate services for mobile, web, backend, and database.

| Layer            | Service                             | Description                        |
| ---------------- | ----------------------------------- | ---------------------------------- |
| Mobile           | Expo EAS                            | Builds and distributes the iOS app |
| Web              | Vercel                              | Hosts React frontend via CDN       |
| Backend          | Vercel                              | Serverless Express API             |
| Database         | Supabase                            | PostgreSQL and authentication      |
| iOS Distribution | Apple Developer + App Store Connect | App publishing                     |
| Policy Hosting   | GitHub Pages                        | Privacy policy                     |

---

## ⚙️ Application Configuration

Production values are defined in `app.json`:

| Field                  | Value          |
| ---------------------- | -------------- |
| `name`                 | Floora         |
| `slug`                 | floora         |
| `scheme`               | floora         |
| `ios.bundleIdentifier` | com.floora.app |
| `android.package`      | com.floora.app |

---

## 🔐 Environment Variables

Environment variables are not stored in the codebase and must be configured per platform.

### Expo (Mobile)

* `EXPO_PUBLIC_SUPABASE_URL`
* `EXPO_PUBLIC_SUPABASE_ANON_KEY`
* `API_URL`

### Vercel (Frontend)

* `VITE_SUPABASE_URL`
* `VITE_SUPABASE_ANON_KEY`
* `VITE_API_URL`

### Vercel (Backend)

* `SUPABASE_URL`
* `SUPABASE_SERVICE_ROLE_KEY`
* `SUPABASE_ANON_KEY`
* `SUPABASE_BUCKET`
* `ADMIN_JWT_SECRET`
* `DISABLE_ADMIN_GUARD`
* `SMTP_PASS`
* `PORT`

---

## 🏗️ Build Process

### Frontend (`floora-web`)

```bash
npm install
npm run build
```

Builds static assets into the `dist/` directory for deployment via CDN.

### Backend (`backend`)

```bash
npm install
npm run build
```

Compiles TypeScript into `dist/server.js` for serverless execution.

---

## ☁️ Hosting Structure

The project is deployed as separate services within a monorepo:

| Service  | Directory     | Platform |
| -------- | ------------- | -------- |
| Frontend | `floora-web/` | Vercel   |
| Backend  | `backend/`    | Vercel   |

Backend routing is configured for serverless execution and secure communication with the frontend.

---

## 📱 iOS Deployment Requirements

* Apple Developer account (Team ID: `PYUT4JN2N7`)
* Registered Bundle ID: `com.floora.app`
* Expo account with EAS access

EAS handles certificate and provisioning profile generation automatically.

---

## 🧩 Supabase Configuration

Before production use:

* Set **Site URL** to the frontend domain
* Configure **Auth redirect URLs** to match frontend routes

Supabase manages authentication, database, and storage services.

---

## 👩‍💻 Developer Instructions (To Be Completed in CSC 191)
Developer setup documentation will be expanded during CSC 191.  

---

## 📄 License  
![License: MIT](https://img.shields.io/badge/License-MIT-b9d7ec.svg?style=flat)

This project is licensed under the **MIT License**.
See the full text in the [`LICENSE`](./LICENSE) file.
<img width="1216" height="188" alt="Screenshot 2025-11-14 at 11 57 27 AM" src="https://github.com/user-attachments/assets/57ce1a1c-8c91-49ca-a80c-b5c6a4a73878" />

