# 🎂 BirthdayHub – Admin Dashboard

A web-based administration dashboard for managing student records and birthday celebrations for the Department of Computer Science and Engineering.

## 🚀 Overview

BirthdayHub Admin Dashboard helps authorized department administrators manage student information and maintain the data used by the BirthdayHub mobile application.

The dashboard provides a centralized interface for managing student records, academic years, and birthday-related information through Supabase.

## 🖥️ Screenshots & UI Preview

### Admin Dashboard
![Admin Dashboard](docs/screenshots/dashboard.png)

### Login Page
![Login Page](docs/screenshots/login.png)

### Student Management
![Student Management](docs/screenshots/students.png)

### Add Student
![Add Student](docs/screenshots/add-student.png)

> Screenshots showcase the user interface and key functionalities of the BirthdayHub Admin Dashboard.

## ✨ Features

- **Admin Authentication** – Secure access for authorized administrators.
- **Student Management** – Add, view, and delete student records.
- **Academic Year Management** – Organize students according to their academic years.
- **Student Information** – Manage student names, register numbers, date of birth, WhatsApp numbers, and profile photos.
- **Supabase Integration** – Store and retrieve student information from the database.
- **Mobile App Integration** – Provide student data for the BirthdayHub React Native application.

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Next.js | Frontend and API routes |
| React | User interface |
| TypeScript | Type safety |
| Supabase | Database and authentication |
| Tailwind CSS | Styling |
| Vercel | Deployment |

## 📁 Project Structure

```text
birthdayhub-admin/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   └── students/
│   ├── login/
│   └── dashboard/
├── components/
├── lib/
├── public/
├── docs/
│   └── screenshots/
│       ├── dashboard.png
│       ├── login.png
│       ├── students.png
│       └── add-student.png
├── .env.local
├── package.json
└── README.md
```

*Note: Update this structure to match the actual repository.*

## ⚙️ Getting Started

### 1. Clone the repository

```bash
git clone YOUR_REPOSITORY_URL
cd birthdayhub-admin
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Use the actual environment variable names required by your Supabase client configuration. Never expose service-role keys or other server secrets.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🗄️ Database

BirthdayHub uses Supabase to manage student information.

The student records include:

- Student ID
- Student Name
- Register Number
- Date of Birth
- WhatsApp Number
- Academic Year
- Student Photo

## 🌐 Deployment

The admin dashboard can be deployed using Vercel.

1. Import the GitHub repository into Vercel.
2. Configure the required environment variables.
3. Deploy the application.
4. Verify the dashboard and Supabase connection.

## 📱 Related Project

**BirthdayHub Mobile Application**

The React Native mobile application uses the student information managed through this dashboard to display student details and birthday information.

## 👨‍💻 Developer

**Jones J.**

- GitHub: [@jones2006](https://github.com/jones2006)

---

<p align="center">
  Made with ❤️ for the Department of Computer Science and Engineering
</p>
