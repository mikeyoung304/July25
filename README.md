# Macon AI Restaurant OS (Rebuild 6.0)

A modern, modular Restaurant Operating System built with Vite, React, TypeScript, and Supabase. Featuring AI-powered voice ordering and real-time kitchen management.

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

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui + Macon AI brand
- **State Management**: React Context + Custom hooks
- **Testing**: Jest + React Testing Library (229 tests)
- **Code Quality**: ESLint + Prettier + TypeScript strict

### AI Gateway (Integrated)
- **Voice Processing**: WebSocket streaming for real-time audio
- **Transcription**: OpenAI Whisper for speech-to-text
- **Chat AI**: GPT-3.5 for natural order conversations
- **Server**: Express.js with WebSocket support
- **Port**: 3002 (runs alongside frontend)

### Backend API (Separate Service - Managed by Luis)
- **API**: Express.js server
- **Database**: Supabase (PostgreSQL)
- **Architecture**: RESTful API endpoints
- **Responsibility**: All database operations

### Key Architecture Decision
- **Frontend NEVER accesses database directly**
- **All data flows through Express.js API**
- **Mock data used during frontend development**

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

Edit `.env` with your configuration:
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI Configuration (for AI features)
OPENAI_API_KEY=your_openai_api_key

# Backend API (Luis's Express server)
VITE_API_BASE_URL=http://localhost:3001

# AI Gateway Configuration
PORT=3002
FRONTEND_URL=http://localhost:5173
```

4. Start the development server with AI features:
```bash
npm run dev:ai
```

This starts both:
- Frontend at `http://localhost:5173`
- AI Gateway at `http://localhost:3002`

### Quick Access:
- 🎤 **Voice Kiosk**: http://localhost:5173/kiosk
- 🚗 **Drive-Thru**: http://localhost:5173/drive-thru
- 🍳 **Kitchen Display**: http://localhost:5173/kitchen

**Note**: Voice features require OpenAI API key. Without it, uses mock transcription.

## 📁 Project Structure

```
src/
├── modules/              # Feature modules (NEW)
│   ├── analytics/       # Analytics and metrics module
│   ├── filters/         # Filtering functionality module
│   ├── floor-plan/      # Floor plan management module
│   ├── kitchen/         # Kitchen Display System module
│   ├── orders/          # Order management module
│   ├── sound/           # Audio management module
│   └── voice/           # Voice capture and ordering module
├── components/          # Shared UI components
│   ├── ui/             # Base UI components (shadcn)
│   ├── shared/         # Reusable business components
│   └── layout/         # Layout components
├── services/           # Service layer - ONLY integration point with backend
│   ├── orders/         # Order services (mock data)
│   ├── tables/         # Table management (mock data)
│   ├── menu/           # Menu services (mock data)
│   ├── statistics/     # Analytics services (mock data)
│   ├── types/          # Shared TypeScript interfaces
│   └── base/           # Base service class for HTTP calls
├── hooks/              # Global hooks
│   ├── keyboard/       # Keyboard navigation hooks
│   └── ...             # Other shared hooks
├── pages/              # Page components
├── core/               # Core providers and contexts
├── types/              # Global TypeScript types
└── App.tsx             # Root component
```

## 🏗️ Architecture

The application follows a **modular architecture** with these key principles:

### Service Layer Pattern (Critical Architecture)
- **Frontend services in `src/services/` are the ONLY integration point with backend**
- **Frontend NEVER communicates directly with Supabase database**
- **All database operations go through Express.js API (managed by Luis)**
- **Currently using mock implementations until Express.js endpoints are ready**
- **Restaurant context provides `restaurant_id` for all API calls**

### Module System
- Self-contained feature modules in `src/modules/`
- Clear public APIs via index.ts exports
- Shared types derived from single source of truth
- Zero circular dependencies

### Component Architecture
- Atomic design principles (atoms → molecules → organisms)
- React.memo for performance optimization
- Comprehensive TypeScript prop typing
- WCAG 2.1 AA accessibility compliance

### State Management
- React Context for global state (RestaurantContext)
- Custom hooks with proper error handling
- Real-time subscriptions via Supabase
- Optimistic UI updates with rollback

### Code Quality
- Single source of truth for types (no duplicates)
- Proper error boundaries and user feedback
- Toast notifications for all user actions
- Comprehensive test coverage

### API Integration Layer (Project Janus)
- **HTTP Client**: Automatic JWT auth, multi-tenancy headers, case transformation
- **Service Adapter Pattern**: Seamless mock-to-real API migration path
- **WebSocket Service**: Real-time order updates with auto-reconnection
- **Floor Plan Service**: Save/load functionality with localStorage fallback
- **Case Transformation**: Deep object conversion between camelCase and snake_case

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

## 📜 Available Scripts

### Development
- `npm run dev` - Start frontend only
- `npm run dev:ai` - Start frontend + AI Gateway (recommended)

### Building & Testing
- `npm run build` - Build for production
- `npm test` - Run all tests
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Check code style
- `npm run lint:fix` - Fix code style issues
- `npm run typecheck` - Check TypeScript types

### Other Commands
- `npm run format` - Format code with Prettier
- `npm run preview` - Preview production build
- `npm run analyze` - Analyze bundle size

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

## 🎨 Styling & Design

- **Tailwind CSS**: Utility-first styling with custom Macon AI theme
- **shadcn/ui**: Pre-built accessible components
- **Brand Colors**: 
  - Background: `#FCFCFA` (True off-white)
  - Primary: `#0A253D` (Macon Navy)
  - Accent: Orange & Teal from logo
- **CSS Variables**: Theme customization
- **Animations**: Smooth transitions and hover effects
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

- Some voice integration tests have timing issues
- Voice capture requires HTTPS in production
- Mock data service intentionally used for frontend development

## 🔮 Roadmap

- [ ] Complete E2E test suite with Playwright
- [ ] Connect to Express.js backend API
- [ ] Implement real-time collaboration features
- [ ] Add inventory management module
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Dark mode theme

## 📄 License

This project is proprietary software. All rights reserved.

## 🏆 Recent Improvements

### Code Quality (January 2025)
- ✅ Consolidated type definitions (removed duplicates)
- ✅ Fixed TypeScript strict mode compliance
- ✅ Added proper error handling with user feedback
- ✅ Integrated Macon AI brand colors throughout
- ✅ Cleaned up 40% of AI-generated bloat
- ✅ Fixed multi-tenant architecture gaps
- ✅ All 229 tests passing

### Architecture
- ✅ Frontend-only repository (backend is separate)
- ✅ Service layer enforces separation (no direct DB access)
- ✅ Mock-first development until Express.js API ready
- ✅ Restaurant context provides multi-tenancy
- ✅ Single source of truth for all types

---

Built with ❤️ by Macon AI Solutions using modern web technologies