import Security, { metadata } from '@/views/security';

// Mirrors `app/(default)/security`. The security disclosure is currently
// zh-only (its copy is not yet localized); the route exists so the language
// switcher resolves here instead of 404-ing. Localization is a later pass.
export { metadata };
export default Security;
