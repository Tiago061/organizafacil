/** Extension contract only. No encryption or biometric implementation is installed. */
export interface LocalSecurityProvider {
  isAvailable(): Promise<boolean>;
  unlock(reason: string): Promise<void>;
  encrypt(content: Uint8Array): Promise<Uint8Array>;
  decrypt(content: Uint8Array): Promise<Uint8Array>;
}
export const securityCapabilities = Object.freeze({
  encryption: false,
  biometrics: false,
});
// A native provider must use Keychain / Android Keystore. Route storage reads/writes
// through it only after migration, interrupted-write recovery and device tests pass.
