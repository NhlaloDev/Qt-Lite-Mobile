/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(tabs)` | `/(tabs)/` | `/(tabs)/profile` | `/(tabs)/transactions` | `/TaskBundle(Firebase)` | `/_sitemap` | `/pages/AIRegistration` | `/pages/ChatInterface` | `/pages/InventoryForm` | `/pages/LoginForm` | `/pages/MyProfile` | `/pages/RegistrationForm` | `/pages/Tasks` | `/pages/TransactionForm` | `/pages/UploadDocuments` | `/pages/ViewDocuments` | `/pages/trans-plot` | `/profile` | `/transactions`;
      DynamicRoutes: never;
      DynamicRouteTemplate: never;
    }
  }
}
