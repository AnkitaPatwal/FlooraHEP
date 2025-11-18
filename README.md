<!-- Floora Logo -->
<img width="2542" height="726" alt="logo_floora" src="https://github.com/user-attachments/assets/f65d1b37-4b80-4059-8c8b-fed86b7e77bf" />

# 🩺 Project Overview
Floora, founded by Dr. Loretta Barry, is a pelvic health practice dedicated to helping pregnant and postpartum women regain strength, confidence, and comfort through evidence-based physical therapy.

To enhance the quality and consistency of client care, this project is developing the Floora HEP digital platform, which includes a client mobile application (iOS and Android) and an admin dashboard website. The platform provides an integrated system for managing exercises, tracking progress, and improving communication between clients and practitioners, reflecting Floora’s premium standard of care.

## ⚙️ Problem Statement
Floora currently relies on handwritten exercise instructions, leading to inefficiency, fragmented communication, and limited scalability. This manual approach does not reflect the practice’s modern, high-quality service model. A secure and user-friendly digital solution is being developed to streamline exercise management, centralize client data, and enhance the overall client experience. The dedicated web and mobile platform aims to modernize operations, improve accessibility, and support Floora’s mission to deliver professional, seamless pelvic health care.

# Objective
The objective of this project is to modernize Floora’s exercise management system by replacing the current manual, handwritten process with a digital, scalable solution. The system aims to improve efficiency, consistency, and personalization in delivering home exercise programs (HEP) to clients. It will enhance the client experience by providing easy access to exercises, progress tracking, and communication through a branded mobile app. Additionally, it will support Floora’s staff with tools to efficiently manage clients, update content, and monitor outcomes in real time.

# Proposed Solution
The proposed solution is a custom-built digital platform consisting of a mobile application for clients and a web-based admin dashboard for staff. The client-facing app will provide secure access to personalized exercise programs, instructional media, and progress tracking, reinforcing Floora’s premium care experience. The admin dashboard will enable staff to manage user accounts, curate and assign exercises, and ensure program accuracy and compliance. Together, these tools will create an integrated, efficient system that supports Floora’s mission of empowering women with accessible pelvic health care.

# Outcome
The implementation of the Floora HEP digital platform will streamline operations, reduce administrative workload, and eliminate inefficiencies associated with manual exercise management. Clients will experience a seamless, modern interface that enhances engagement, adherence, and satisfaction with their personalized programs. Staff will benefit from centralized tools that improve accuracy, oversight, and scalability, enabling Floora to serve more clients without compromising quality. Overall, the solution will strengthen Floora’s brand in their evidence-based pelvic health care.

## Tech Stack  

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
<!-- Demos side-by-side (App left, Website right) -->
<p align="center">
  <img src="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGRkdHd4dmk3NXNsczZseHg3aGs3YnZnY2o3Z24wb2p1b29uNzBjZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/1sosTG72VQeXW675ZL/giphy.gif" alt="Appdemo" width="200" />
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <img src="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExcjFwdHM2M3YyenpvcXYyZG9vcWNsMTZkbndzeHIwOG1xZzZrejJjaCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/cntDWPVfH61UKif0p3/giphy.gif" alt="web-demo" width="500" />
</p>

<!-- Figma Wireframe -->
<img width="1252" height="625" alt="wireframe_floora" src="https://github.com/user-attachments/assets/ea9731de-6abf-4186-ad2e-cb5b0acb87b8" />

<!-- ERD -->
<p align="center">
  <img alt="ERD" src="https://github.com/user-attachments/assets/f6117ca5-6385-46b5-a4a2-dd2993496e4c" style="width:50%; height:auto;" />
</p>

## Project Milestones & Timeline

**Milestone 1 — Project Setup (Week 1–2)**
- Set up GitHub repositories for web and mobile  
- Set up Jira board, sprints, and epics  

**Milestone 2 — Design Phase (Week 2–3)**
- Created mockups and wireframes for web and mobile  
- Designed main screens and user flow  
- Finalized layout structure before development  

**Milestone 3 — Frontend Development (Weeks 3–6)**
- Built core web frontend pages and components  
- Built main mobile app screens  
- Added navigation, layout, and UI structure  

**Milestone 4 — Supabase Integration (Weeks 4–7)**
- Connected frontend to Supabase  
- Created ERD and database schema  
- Added tables needed for users, programs, and exercises  

**Milestone 5 — Backend Development (Current Sprint)**
- Started implementing backend logic  
- Added signup endpoint  
- Added admin approval endpoint  
- Began building additional backend functions and routes

**Milestone 6 — Client Dashboard Features (Sprint 5)**  
- Enabled automatic module release every 7 days  
- Added module view with detailed exercise information  
- Implemented navigation to Profile, Home, and Roadmap screens  
- Added written exercise instructions and muscle-group labels  
- Displayed sets and reps for each exercise  
- Added video controls (pause/resume)  
- Added a module completion tracker for client progress  

**Milestone 7 — Admin Account Management (Sprint 5–6)**  
- Added admin view for pending client access requests  
- Enabled approval and rejection of new client accounts  
- Added functionality to remove clients from the system  
- Implemented confirmation popups for successful or failed removals  
- Added search functionality for clients by first and last name  
- Added the ability to upload new exercises to the library  

**Milestone 8 — Exercise Library Enhancements (Sprint 6–7)**  
- Added confirmation popups for adding new exercises  
- Enabled adding and editing written instructions  
- Added muscle-group tags for better organization  
- Added option to replace outdated exercise videos  
- Enabled deletion of unused exercises  
- Added popups for successful or failed exercise deletion  
- Added visibility for how many clients use each exercise  
- Added filtering options to sort exercises by category  

**Milestone 9 — Plan Creation & Assignment (Sprint 8)**  
- Added ability to create plans using existing exercises  
- Enabled assignment of plans to individual clients  
- Added customization of sets and reps per client  
- Added functionality to remove exercises from a client’s plan  
- Added confirmation popups for editing or removing plan items  

**Milestone 10 — Assignment Tracking & Notifications (Sprint 9)**  
- Added confirmation step before removing assigned exercises  
- Added popups for successful or failed exercise removal  
- Added view for admins to see all plans assigned to each client  
- Added confirmation message when a plan is successfully assigned  

<!-- Floora Color Pallette -->
<img width="1216" height="188" alt="Screenshot 2025-11-14 at 11 57 27 AM" src="https://github.com/user-attachments/assets/57ce1a1c-8c91-49ca-a80c-b5c6a4a73878" />

## 📄 License
This project is licensed under the **MIT License**.
See the full text in the [`LICENSE`](./LICENSE) file.
