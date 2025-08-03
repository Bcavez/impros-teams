# Team Management Dashboard PWA

A Progressive Web Application (PWA) built with Vue.js 3, TypeScript, and Vite for managing team members, coaching sessions, and shows.

## Features

### User Management
- **User Authentication**: Login and registration system
- **Role-based Access Control**: 
  - Admin: Full access to all features
  - Captain: Team-specific management capabilities
  - Member: Basic team dashboard access
- **Team Assignment**: Users can be assigned to one of three teams (Samurai, Gladiator, Viking)

### Team Dashboard
- **Interactive Calendar**: View coaching sessions and shows
- **Status Management**: Toggle attendance status (Present/Absent/Undecided) for events
- **Visual Indicators**: Color-coded status display for easy tracking

### Admin Dashboard (Captains & Admins)
- **Coaching Management**:
  - Create coaching sessions
  - View attendance matrix
  - Toggle member attendance status
- **Show Management**:
  - Create shows with descriptions
  - Add show dates with member limits
  - Assign up to 5 members per show date
  - Track availability matrix

## Technology Stack

- **Frontend**: Vue.js 3 with Composition API
- **TypeScript**: For type safety
- **State Management**: Pinia
- **Routing**: Vue Router 4
- **Build Tool**: Vite
- **PWA**: Vite Plugin PWA
- **Date Handling**: date-fns
- **Styling**: CSS with modern design

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd team-management-pwa
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment.

## Demo Credentials

For testing purposes, the following demo accounts are available:

| Role | Email | Team |
|------|-------|------|
| Admin | admin@example.com | - |
| Samurai Captain | samurai@example.com | Samurai |
| Gladiator Captain | gladiator@example.com | Gladiator |
| Viking Captain | viking@example.com | Viking |
| Samurai Member | member1@example.com | Samurai |

## Application Structure

```
src/
├── components/          # Reusable Vue components
├── router/             # Vue Router configuration
├── stores/             # Pinia stores
│   ├── user.ts        # User authentication & management
│   ├── coaching.ts    # Coaching sessions & attendance
│   └── shows.ts       # Shows & availability tracking
├── views/              # Page components
│   ├── LoginView.vue  # Authentication page
│   ├── TeamDashboardView.vue    # Team member dashboard
│   └── AdminDashboardView.vue   # Admin/captain dashboard
└── main.ts            # Application entry point
```

## PWA Features

- **Offline Support**: Service worker for offline functionality
- **Installable**: Can be installed as a native app
- **Responsive Design**: Works on desktop and mobile devices
- **Fast Loading**: Optimized for performance

## Key Features

### Authentication Flow
1. Users start at the login page
2. After successful authentication, they're redirected based on their role:
   - Admins/Captains → Admin Dashboard
   - Members → Team Dashboard

### Team Dashboard
- Interactive calendar showing coaching sessions and shows
- Click on dates to toggle attendance status
- Visual status indicators (green=present, red=absent, yellow=undecided)

### Admin Dashboard
- **Coaching Tab**: Manage coaching sessions and view attendance
- **Shows Tab**: Create shows, add dates, assign members, track availability
- Modal forms for creating new sessions and shows
- Interactive attendance/availability matrices

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Run ESLint

### Adding New Features

1. **New Store**: Create a new Pinia store in `src/stores/`
2. **New View**: Add a new Vue component in `src/views/`
3. **New Route**: Update `src/router/index.ts`
4. **Styling**: Use scoped CSS in components or global styles in `src/App.vue`

## Deployment

The application is built as a PWA and can be deployed to any static hosting service:

- **Netlify**: Drag and drop the `dist` folder
- **Vercel**: Connect your repository for automatic deployments
- **GitHub Pages**: Deploy from the `dist` directory
- **Firebase Hosting**: Use Firebase CLI to deploy

## Browser Support

- Chrome (recommended for PWA features)
- Firefox
- Safari
- Edge

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and type checking
5. Submit a pull request

## License

This project is licensed under the MIT License.
