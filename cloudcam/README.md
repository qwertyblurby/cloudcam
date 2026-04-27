# cloudcam

A Cloudinary React + Vite + TypeScript project scaffolded with [create-cloudinary-react](https://github.com/cloudinary-devs/create-cloudinary-react).

## ⚠️ Important: Directory Structure

**This project uses a two-level structure:**
```
/cloudcam (root)
  ├── package.json (basic project file - NOT used for development)
  └── /cloudcam (subdirectory - THE ACTUAL PROJECT)
      ├── package.json (Vite/React project - THIS IS USED)
      ├── src/
      ├── public/
      └── all other project files
```

**All npm commands must be run from the `/cloudcam/cloudcam` subdirectory**, or use the `--prefix` flag. See [Running the Project](#running-the-project) for details.

---

## System Requirements

Before you begin, ensure you have:

| Requirement | Version | Purpose |
|-------------|---------|---------|
| **Node.js** | ^20.19.0 or >=22.12.0 | JavaScript runtime and package management |
| **npm** | ^10.0.0 | Node package manager (comes with Node.js) |
| **OS** | macOS, Linux, or Windows | Operating system |
| **Browser** | Modern (Chrome, Firefox, Safari, Edge) | Running the dev server on http://localhost:5173 |
| **Disk Space** | ~500MB | For node_modules and dependencies |

### Check Your Installation

```bash
node --version    # Should show v20.x.x or v22.x.x+
npm --version     # Should show v10.x.x or higher
```

---

## Installation Guide

### Step 1: Install Node.js (if needed)

If `node --version` doesn't work, install Node.js:

1. Visit [nodejs.org](https://nodejs.org/)
2. Download the LTS (Long Term Support) version
3. Follow the installer for your OS
4. Verify: `node --version` and `npm --version`

### Step 2: Navigate to the Project Directory

```bash
cd /path/to/cloudcam/cloudcam
```

**Important**: You must be in the `/cloudcam/cloudcam` subdirectory, NOT the root `/cloudcam` directory.

### Step 3: Install All Dependencies

```bash
npm install
```

This command reads `package.json` and installs **192 packages** into the `node_modules/` folder. This includes:

#### Production Dependencies (shipped with your app):
- **React** (19.2.0) - UI library for building components
- **React DOM** (19.2.0) - Binds React to the browser DOM
- **Vite** (6.0.0) - Lightning-fast build tool and dev server
- **TypeScript** (5.9.3) - Adds type safety to JavaScript
- **Three.js** (0.184.0) - 3D graphics library
- **@cloudinary/react** (1.14.3) - Cloudinary components
- **@cloudinary/url-gen** (1.22.0) - URL generation for Cloudinary assets
- **@mediapipe/tasks-vision** (0.10.34) - AI/ML models for face, hand, and pose detection

#### Development Dependencies (only used during development):
- **TypeScript Compiler** (@types/*) - Type definitions for all libraries
- **ESLint** (9.39.1) - Code quality checker
- **eslint-plugin-react** - React-specific linting rules
- **@vitejs/plugin-react** - React plugin for Vite
- **Vite** - Dev server and bundler

### Step 4: Verify Installation

```bash
npm run
```

You should see output listing available scripts:
```
  dev
    vite
  build
    tsc -b && vite build
  lint
    eslint .
  preview
    vite preview
```

If you see these scripts, the installation was successful. ✅

---

## Running the Project

### Option 1: From the cloudcam subdirectory (Recommended)

```bash
cd cloudcam
npm run dev
```

### Option 2: From the root directory

```bash
npm --prefix cloudcam run dev
```

### Expected Output

```
  VITE v6.4.2  ready in 339 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

Open your browser to **http://localhost:5173/** and you should see the application.

---

## Available npm Scripts

Run these from the `cloudcam/` directory:

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start the development server (http://localhost:5173) |
| `npm run build` | Create optimized production build in `dist/` folder |
| `npm run lint` | Check code quality and style issues |
| `npm run preview` | Preview the production build locally |

---

## Cloudinary Setup

This project uses Cloudinary for image management. If you don't have a Cloudinary account yet:
- [Sign up for free](https://cld.media/reactregister)
- Find your cloud name in your [dashboard](https://console.cloudinary.com/app/home/dashboard)

### Environment Variables

Your `.env` file has been pre-configured with:
- `VITE_CLOUDINARY_CLOUD_NAME`: dhg3uyqbv
- `VITE_CLOUDINARY_UPLOAD_PRESET`: (not set - add one for uploads)

**Note**: Transformations work without an upload preset (using sample images). Uploads require an unsigned upload preset.

To create an unsigned upload preset:
1. Go to https://console.cloudinary.com/app/settings/upload/presets
2. Click "Add upload preset"
3. Set it to "Unsigned" mode
4. Add the preset name to your `.env` file
5. **Save** the `.env` file and restart the dev server so the new values load correctly.

---

## Troubleshooting

### "Missing script: dev" Error

**Problem**: You get this error when running `npm run dev`:
```
npm error Missing script: "dev"
```

**Solution**: 
- You're running the command from the wrong directory
- Make sure you're in `/cloudcam/cloudcam`, not `/cloudcam`
- Use `pwd` to check your current directory
- Use `npm --prefix cloudcam run dev` if you can't navigate to the subdirectory

### "vite not found" Error

**Problem**: Command runs but vite isn't installed.

**Solution**:
```bash
cd cloudcam
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Packages Not Installing

**Problem**: `npm install` hangs or fails.

**Solution**:
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Port 5173 Already in Use

**Problem**: Another app is using port 5173.

**Solution**: Kill the other process or use a different port:
```bash
npm run dev -- --port 3000
```

---

## Project Structure

```
cloudcam/
├── src/                    # Source code
│   ├── App.tsx            # Main React component
│   ├── main.tsx           # Application entry point
│   ├── cloudinary/        # Cloudinary integration
│   ├── effects/           # Visual effects (filters, AR)
│   ├── tracking/          # AI/ML tracking services
│   └── ui/                # UI utilities
├── public/                # Static assets
│   └── models/            # ML models (face, hand, pose detection)
├── package.json           # Project dependencies
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

---

## Learn More

- [Cloudinary React SDK Docs](https://cloudinary.com/documentation/react_integration)
- [Vite Documentation](https://vite.dev)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/)

## AI Assistant Support

This project includes AI coding rules for your selected AI assistant(s). The rules help AI assistants understand Cloudinary React SDK patterns, common errors, and best practices.

**Try the AI Prompts**: Check out the "🤖 Try Asking Your AI Assistant" section in the app for ready-to-use Cloudinary prompts! Copy and paste them into your AI assistant to get started.
