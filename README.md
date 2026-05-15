# Jan Aushadhi Finder

An Android Application and Web Platform designed to help users find generic medicines via the PM Jan Aushadhi Program in India, saving them up to 90% on their medical expenses.

This repository contains both the backend services and the native Android application frontend.

## Features

- **Generic Medicine Search**: Search for branded medicines and find their generic equivalents and prices.
- **Savings Calculator**: Build your prescription to calculate exactly how much money you save by switching to Jan Aushadhi generic medicines.
- **Store Locator**: Find nearby Jan Aushadhi Kendras using an interactive map, including filters for "Open Now" and "Top Rated".
- **Reminders**: Keep track of your medication refill dates.
- **User Authentication**: Sync your favorites, search history, and reminders across devices.

## Project Structure

- `android/` - The native Android Application built with Kotlin and Jetpack Compose.
- `backend/` - Node.js/Express backend API.
- `frontend/` - PWA Web Application (HTML/JS/CSS).
- `data/` - Database schemas and seeding scripts (Supabase/PostgreSQL).

## Tech Stack

### Android App
- Language: Kotlin
- UI Framework: Jetpack Compose (Material Design 3)
- Architecture: MVVM
- Networking: Retrofit & OkHttp
- Concurrency: Kotlin Coroutines & Flow

### Backend API
- Runtime: Node.js
- Framework: Express.js
- Database: Supabase (PostgreSQL)

## Getting Started

### Backend Setup
1. Copy `.env.example` to `.env` and fill in your Supabase credentials.
2. Install dependencies: `npm install`
3. Start the server: `npm run dev`

### Android App Setup
1. Open Android Studio.
2. Select **Open** and choose the `android/` directory in this repository.
3. Wait for Gradle to sync and download the required dependencies.
4. Ensure your Node.js backend is running.
5. Click **Run** in Android Studio to launch the app on an emulator or physical device.

## License

MIT License
