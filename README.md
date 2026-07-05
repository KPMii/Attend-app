# Attend App

A QR-based attendance system for students and faculty.

## Features

- QR attendance system
- Offline sync
- Supabase backend

Attend App (Work in Progress)

An attendance management system designed for schools to simplify and modernize student tracking using QR-based authentication and offline-first synchronization.

This project is still in active development and features may change.

```

Current Features:

Authentication System
Separate login for students and faculty
Role-based access control (students / teachers)
QR Attendance System
Teachers generate dynamic QR codes for sessions
Students scan QR codes to mark attendance
QR codes auto-rotate every 15 seconds for basic security
Offline-First Support
Local storage using SQLite
Sync queue system for automatic Supabase sync when online
Session & Subject Management
Teachers can create and manage attendance sessions
View and manage all assigned subjects in one place
Student Management
Add and manage students using School ID numbers (subject to change)
State Management
Uses Zustand for lightweight and efficient state handling (including sync queue integration)

```

Planned / Future Features
Attendance analytics dashboard (student performance & attendance graphs)
Event-based attendance (not limited to subjects)
PDF export system for reports using PDFMake
Faculty role customization (e.g., principal, supervisor, teacher hierarchy)
Improved security and QR validation system

This project is still in early development (vibecoded stage). Features, architecture, and data structure may change as the system evolves.
