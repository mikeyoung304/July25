# Rebuild 6.0

A modern, modular Restaurant Operating System built with Vite, React, TypeScript, and Supabase.

## 🚀 Features

- 🍽️ **Kitchen Display System (KDS)**: Real-time order management with status tracking
- 🎤 **Voice Ordering Kiosk**: Natural language voice capture for customer orders
- 📊 **Order History & Analytics**: Comprehensive order tracking and performance metrics
- 🔊 **Audio Notifications**: Customizable sound alerts for new orders and status changes
- 🎯 **Smart Filtering**: Advanced filtering and search capabilities
- ♿ **Accessibility First**: Full keyboard navigation and screen reader support
- 📱 **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- ⚡ **Real-time Updates**: Powered by Supabase for instant synchronization
- 🏢 **Multi-tenant Ready**: Restaurant context for multi-location support

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React Context + Custom hooks
- **Real-time**: Supabase subscriptions
- **Testing**: Jest + React Testing Library
- **Code Quality**: ESLint + Prettier

## 📋 Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager
- Git

## 🚀 Getting Started

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd rebuild-6.0
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Restaurant Configuration
VITE_DEFAULT_RESTAURANT_ID=your_restaurant_id
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 📁 Project Structure

```
src/
├── modules/              # Feature modules (NEW)
│   ├── orders/          # Order management module
│   │   ├── components/  # Order-specific components
│   │   ├── hooks/       # Order-specific hooks
│   │   ├── types/       # Order types
│   │   └── index.ts     # Module exports
│   ├── sound/           # Audio management module
│   └── filters/         # Filtering functionality module
├── components/          # Shared UI components
│   ├── ui/             # Base UI components (shadcn)
│   ├── shared/         # Reusable business components
│   └── layout/         # Layout components
├── services/           # Service layer (refactored)
│   ├── orders/         # Order services
│   ├── tables/         # Table management
│   ├── menu/           # Menu services
│   ├── statistics/     # Analytics services
│   └── base/           # Base service class
├── hooks/              # Global hooks
│   ├── keyboard/       # Keyboard navigation hooks
│   └── ...             # Other shared hooks
├── features/           # Legacy feature modules
├── pages/              # Page components
├── core/               # Core providers and contexts
├── lib/                # Utilities and helpers
├── types/              # Global TypeScript types
└── App.tsx             # Root component
```

## 🏗️ Architecture

The application follows a **modular architecture** with these key principles:

### Service Layer Pattern
- Domain-specific services with interfaces
- Dependency injection via ServiceFactory
- Mock implementations for development
- Easy swap to real API endpoints

### Module System
- Self-contained feature modules
- Clear public APIs
- Shared types and utilities
- Minimal coupling between modules

### Component Architecture
- Atomic design principles
- Memoized components for performance
- Comprehensive prop typing
- Accessibility built-in

### State Management
- React Context for global state (Restaurant)
- Custom hooks for local state
- Real-time subscriptions via Supabase
- Optimistic UI updates

## 📝 Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format code with Prettier
npm run typecheck    # TypeScript type checking

# Testing
npm test             # Run all tests
npm test:watch       # Run tests in watch mode
npm test:coverage    # Generate coverage report

# Analysis
npm run analyze      # Analyze bundle size
node scripts/analyze-codebase.cjs  # Code metrics analysis
```

## 🧪 Testing

The project includes comprehensive testing:

- **Unit Tests**: Business logic and utilities
- **Component Tests**: UI components with RTL
- **Hook Tests**: Custom React hooks
- **Service Tests**: API layer with mocking
- **Integration Tests**: Feature workflows

Run tests:
```bash
npm test                    # Run all tests
npm test -- --coverage      # With coverage report
npm test -- OrderCard       # Test specific component
```

## ⌨️ Keyboard Shortcuts

The application supports comprehensive keyboard navigation:

- `Ctrl+K` - Go to Kitchen Display
- `Ctrl+O` - Go to Voice Kiosk
- `Ctrl+H` - Go to Order History
- `/` - Focus search
- `?` - Show keyboard shortcuts
- `Escape` - Close modals/dialogs

## 🎨 Styling

- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Pre-built accessible components
- **CSS Variables**: Theme customization
- **Dark Mode**: System preference support (coming soon)

## 🔧 Configuration

### MCP Servers (Development)
The project supports Model Context Protocol servers for enhanced development:
- **filesystem**: File operations
- **desktop**: System commands
- **sequential**: Complex analysis
- **context7**: Documentation lookup
- **github**: Repository operations
- **puppeteer/playwright**: Browser automation

## 📊 Performance

- **Code Splitting**: Route-based lazy loading
- **Memoization**: Optimized re-renders
- **Virtual Scrolling**: For large lists (planned)
- **Bundle Size**: < 500KB gzipped
- **Lighthouse Score**: 90+ (target)

## 🚀 Deployment

### Production Build
```bash
npm run build
```

The built files will be in the `dist` directory.

### Environment Variables
Required for production:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Hosting Options
- Vercel (recommended)
- Netlify
- AWS S3 + CloudFront
- Any static hosting service

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Coding Standards
- Follow TypeScript best practices
- Write tests for new features
- Update documentation
- Follow the established module pattern
- Ensure accessibility compliance

## 📚 Documentation

- [Modular Architecture](./docs/MODULAR_ARCHITECTURE.md)
- [Refactoring Plan](./docs/REFACTORING_PLAN.md)
- [Testing Guide](./docs/FUNCTIONAL_TESTING_CHECKLIST.md)
- [API Documentation](./docs/API.md) (coming soon)

## 🐛 Known Issues

- Some integration tests need updating after refactoring
- Voice capture requires HTTPS in production
- Mock data service pending real API integration

## 🔮 Roadmap

- [ ] Complete E2E test suite with Playwright
- [ ] Implement real-time collaboration features
- [ ] Add inventory management module
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)

## 📄 License

This project is proprietary software. All rights reserved.

---

Built with ❤️ using modern web technologies