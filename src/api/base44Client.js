// Compatibility shim: legacy imports can still resolve while the app migrates off Base44.
// New code should import { dim as base44 } from '@/api/dimDataClient'.
export { dim as base44 } from './dimDataClient';
