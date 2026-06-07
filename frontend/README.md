# Tawazon Health - Frontend

Modern e-commerce frontend for Tawazon Health (Blood Sugar Balance Supplements).

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **React 19** - Latest React features

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn

### Installation

1. Navigate to the frontend directory:
```bash
cd /Users/macbook/Desktop/ECOM-STORE/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server (hot reload enabled)
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx       # Root layout with metadata
│   ├── page.tsx         # Home page
│   └── globals.css      # Global styles
├── next.config.ts       # Next.js configuration
├── tailwind.config.ts   # Tailwind configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies
```

## Features

- ✨ Beautiful, modern UI with Tailwind CSS
- 📱 Fully responsive design
- ⚡ Server-side rendering with Next.js
- 🎯 Product showcase
- 🛒 Cart integration ready
- 🌍 Multi-language ready (Arabic/French/English)
- ♿ Accessible components

## Development

The dev server includes:
- Hot Module Replacement (HMR)
- Fast Refresh for React components
- TypeScript checking
- Tailwind CSS IntelliSense support

## Next Steps

1. Connect to backend API
2. Implement product catalog
3. Add shopping cart functionality
4. Set up payment integration (Stripe, 2Checkout)
5. Implement user authentication
6. Add WhatsApp integration for COD orders

## License

Proprietary - Tawazon Health © 2026
