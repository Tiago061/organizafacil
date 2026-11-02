import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "br.app.organizafacil",
  appName: "OrganizaFácil",
  webDir: "dist",
  ios: { contentInset: "automatic" },
  plugins: {
    LocalNotifications: { smallIcon: "ic_notification", iconColor: "#2563EB" },
  },
};
export default config;
