/**
 * Public configuration exports
 *
 * @description
 * Exposes environment parsing, Docker secret resolution and aggregated startup configuration errors.
 */
export {
  ConfigError,
  loadConfig,
  resolveSecretFiles,
} from '@internal/backend-config/lib/load-config/load-config';
