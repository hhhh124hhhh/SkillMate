/**
 * Component Barrel Export
 *
 * Centralizes all component exports for better tree-shaking and cleaner imports.
 * Based on Vercel React Best Practices - bundle-barrel-imports rule.
 *
 * @see https://github.com/vercel/next.js/tree/canary/docs/react-best-practices
 */

// Main views
export { CoworkView } from './CoworkView.js';
export { SettingsView } from './SettingsView.js';
export { UserGuideView } from './UserGuideView.js';

// Dialogs and modals
export { ConfirmDialog } from './ConfirmDialog.js';

// Permission management
export { TrustedProjectsList } from './TrustedProjectsList.js';

// Special pages
export { FloatingBallPage } from './FloatingBallPage.js';

// Notifications and palettes
export { UpdateNotification } from './UpdateNotification.js';
export { CommandPalette } from './CommandPalette.js';

// Error handling
export { ErrorBoundary } from './ErrorBoundary.js';

// UI components
export { ToastProvider } from './ui/ToastProvider.js';
