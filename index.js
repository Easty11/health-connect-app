import { registerRootComponent } from 'expo';

import Root from './Root';

// registerRootComponent calls AppRegistry.registerComponent('main', () => Root);
// Root mounts both the scraper UI (App.js) and the Health Connect UI
// (SyncScreen.js) so both are reachable in a single build.
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(Root);
