
# PosePerfect AI

## Project Description
PosePerfect AI is a web application designed to help users improve their exercise form using AI-powered pose detection and voice coaching. The application provides real-time feedback, tracks progress, and offers a variety of exercises to choose from.

## Features
- **AI-Powered Pose Detection**: Real-time analysis of exercise form.
- **Voice Coaching**: Audio feedback and instructions during workouts.
- **Exercise Selection**: A variety of exercises to choose from.
- **Progress Tracking**: Monitor your performance and improvements over time.
- **Intuitive User Interface**: Clean and responsive design for a seamless user experience.

## Technologies Used
- **Frontend**: React, TypeScript, Tailwind CSS
- **Pose Detection**: MediaPipe Pose
- **State Management**: Zustand
- **Build Tool**: Vite

## Installation
To get a local copy up and running, follow these simple steps.

### Prerequisites
- Node.js (LTS version recommended)
- npm or Yarn or Bun

### Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/poseperfect-ai.git
   cd poseperfect-ai
   ```
2. Install dependencies:
   ```bash
   bun install
   # or npm install
   # or yarn install
   ```

## Running the Project
To run the development server:

```bash
bun dev
# or npm run dev
# or yarn dev
```

Open your browser and navigate to `http://localhost:5173` (or the port indicated in your terminal).

## Project Structure
```
.gitignore
README.md
bun.lockb
components.json
eslint.config.js
index.html
package-lock.json
package.json
postcss.config.js
public/
src/
├── App.css
├── App.tsx
├── assets/
├── components/
│   ├── ExerciseSelector.tsx
│   ├── Header.tsx
│   ├── NLPCommands.tsx
│   ├── Navigation.tsx
│   ├── PoseDetection.tsx
│   ├── VoiceCoach.tsx
│   └── ui/
├── hooks/
│   ├── use-mobile.tsx
│   └── use-toast.ts
├── index.css
├── lib/
│   └── utils.ts
├── main.tsx
├── pages/
│   ├── Index.tsx
│   ├── NotFound.tsx
│   ├── Progress.tsx
│   └── Settings.tsx
├── store/
│   └── metricsStore.ts
└── vite-env.d.ts
tailwind.config.ts
tsconfig.app.json
tsconfig.json
tsconfig.node.json
vite.config.ts
```

## Contributing
Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request


## Contact
Your Name - salimansari786@outlook.in
