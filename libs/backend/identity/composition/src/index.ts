export {
  IDENTITY_DATABASE,
  IdentityModule,
  type IdentityModuleOptions,
} from '@internal/identity-composition/lib/identity.module';
export {
  bootstrapAdmin,
  loadIdentityFixtureData,
  generateSigningKey,
  migrateIdentity,
} from '@internal/identity-composition/lib/tasks/identity/identity.tasks';
