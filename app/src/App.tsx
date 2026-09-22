import React, { useEffect } from 'react';
import {
  NavigationContainer, DefaultTheme, createNavigationContainerRef,
  type NavigatorScreenParams,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppState, ScrollView, Text, View } from 'react-native';
import {
  useFonts,
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
} from '@expo-google-fonts/instrument-sans';
import { Newsreader_400Regular_Italic, Newsreader_500Medium_Italic } from '@expo-google-fonts/newsreader';
import { SplineSansMono_400Regular, SplineSansMono_500Medium } from '@expo-google-fonts/spline-sans-mono';
import { colors } from './theme';
import { useStore } from './store';
import { isLiveMode } from './api/supabase';
import { restoreSession } from './api/auth';

import IntroScreen from './screens/onboarding/IntroScreen';
import SignupScreen from './screens/onboarding/SignupScreen';
import EmailScreen from './screens/onboarding/EmailScreen';
import ForgotScreen from './screens/onboarding/ForgotScreen';
import IntakeScreen from './screens/onboarding/IntakeScreen';
import BuildScreen from './screens/onboarding/BuildScreen';
import ReviewScreen from './screens/onboarding/ReviewScreen';
import ScheduleScreen from './screens/onboarding/ScheduleScreen';
import PaywallScreen from './screens/onboarding/PaywallScreen';
import CreationScreen from './screens/onboarding/CreationScreen';
import MainTabs, { type TabsParamList } from './screens/MainTabs';
import PlayerScreen from './screens/PlayerScreen';
import FriendsScreen from './screens/social/FriendsScreen';
import DiscoverScreen from './screens/social/DiscoverScreen';
import ContactsScreen from './screens/social/ContactsScreen';
import SettingsScreen from './screens/SettingsScreen';
import VoiceRecorderScreen from './screens/VoiceRecorderScreen';
import MiniPlayer from './components/MiniPlayer';
import SessionCeleb from './components/SessionCeleb';
import { AudioSessionProvider, useAudioSession } from './audio/AudioSession';

export type RootStackParamList = {
  Intro: undefined;
  Signup: undefined;
  Email: { email?: string } | undefined;
  Forgot: undefined;
  Intake: undefined;
  Build: undefined;
  Review: undefined;
  Schedule: undefined;
  Paywall: undefined;
  /**
   * Nested so a caller can name the tab to land on — the session-end hand-off
   * needs Home specifically, not "whichever tab was last open".
   */
  Main: NavigatorScreenParams<TabsParamList> | undefined;
  /** Audio-only for v1; the movie mode param returns with the media layer. */
  Player: undefined;
  Creation: { step?: 'photo' } | undefined;
  /**
   * No param = record the whole set; affirmationId = re-record just that one.
   * fromCreation routes the finish CTA onward to the photo step instead of
   * dropping the user back on the voice picker.
   */
  VoiceRecorder: { affirmationId?: string; fromCreation?: boolean } | undefined;
  Friends: undefined;
  Discover: undefined;
  Contacts: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Lets the mini player — which lives outside the navigator — open the Player. */
export const navRef = createNavigationContainerRef<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.cream },
};

/** Shows crashes readably instead of a silent white screen (published bundles hide errors). */
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <ScrollView style={{ flex: 1, backgroundColor: colors.cream }} contentContainerStyle={{ padding: 32, paddingTop: 80 }}>
          <Text style={{ fontSize: 18, color: colors.ink, fontWeight: '600' }}>Something broke on launch</Text>
          <Text style={{ fontSize: 13, color: colors.warmGray, marginTop: 12 }} selectable>
            {String(this.state.error?.message ?? this.state.error)}
          </Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

function Root() {
  const hydrate = useStore(s => s.hydrate);
  const session = useAudioSession();
  const [route, setRoute] = React.useState('');
  /**
   * Whether the ROOT stack is showing the tab navigator — i.e. whether the
   * floating glass bar is on screen and the mini player has to clear it.
   *
   * This can't come from `getCurrentRoute()`, which returns the DEEPEST route:
   * inside the tabs that's 'Home' or 'Feed', never 'Main'. The old
   * `route === 'Main'` check was therefore always false, so the mini player
   * dropped to its no-tabs offset and sat right on top of the bar (Trevor,
   * Sept 14). 'Friends' exists as both a tab and a pushed stack screen, so the
   * leaf name can't disambiguate it either — only the root stack can.
   */
  const [onTabs, setOnTabs] = React.useState(false);
  const syncRoute = React.useCallback(() => {
    setRoute(navRef.getCurrentRoute()?.name ?? '');
    const root = navRef.isReady() ? navRef.getRootState() : undefined;
    const top = root?.routes?.[root.index ?? root.routes.length - 1]?.name;
    setOnTabs(top === 'Main');
  }, []);
  // Live mode: restore a persisted Supabase session and land signed-in users on Main.
  const [authState, setAuthState] = React.useState<'checking' | 'in' | 'out'>(isLiveMode ? 'checking' : 'out');
  useEffect(() => {
    if (!isLiveMode) return;
    // restoreSession is storage-only (instant); the 3s race is a belt-and-
    // suspenders cap so a blank launch screen is impossible either way.
    Promise.race([
      restoreSession(),
      new Promise<{ signedIn: boolean; displayName?: string }>(res =>
        setTimeout(() => res({ signedIn: false }), 3000)),
    ]).then(r => {
      if (r.displayName) useStore.getState().set({ userName: r.displayName.split(/\s+/)[0] });
      setAuthState(r.signedIn ? 'in' : 'out');
    });
  }, []);
  const [fontsLoaded, fontError] = useFonts({
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    Newsreader_400Regular_Italic,
    Newsreader_500Medium_Italic,
    SplineSansMono_400Regular,
    SplineSansMono_500Medium,
  });

  useEffect(() => { hydrate(); }, [hydrate]);

  /**
   * A VISIT is one sitting with the app (Trevor, Sept 22: "whenever the user
   * closes the app and reopens it to do a new session it will count as a new
   * track"). Launch is a visit; so is every return from the background, which
   * is the path a push notification takes.
   *
   * This is what lets the clock stop being the only answer to "which track?".
   * Four sessions back-to-back at 9am is one visit and stacks as ×4; leaving
   * and coming back at 9:20 is a second visit and earns its own track, even
   * though the clock reads the same slot both times.
   */
  useEffect(() => {
    useStore.getState().beginVisit();
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') useStore.getState().beginVisit();
    });
    return () => sub.remove();
  }, []);

  /**
   * The end of a session, as one movement (Trevor, Sept 22).
   *
   * Finish the last affirmation in the play-all Player → the big celebration
   * owns the screen → when it's done the Player shows itself out and drops the
   * user on Home, where the two stat cards land their own celebration as they
   * update. The user never has to dismiss anything.
   *
   * Navigating to Main with `screen: 'Home'` rather than `goBack()` on purpose:
   * goBack returns to whichever tab was last active, so opening the Player from
   * Progress would strand the celebration on a screen with no stat cards on it.
   * Home's own stage-two effect is already gated on `bigCeleb` clearing, so the
   * hand-off needs no coordination beyond this — see HomeScreen.
   */
  // Read through a ref: this runs ~4s after the celebration appeared, and the
  // answer to "is playback still running" is only valid at the moment it fires.
  const sessionRef = React.useRef(session);
  sessionRef.current = session;
  const endSessionCeleb = React.useCallback(() => {
    // Only show the Player out if playback has actually finished. On loop or a
    // sleep timer the next session is already running, and ejecting the user to
    // Home mid-track would be the opposite of what they asked for (Sept 22).
    const ending = !sessionRef.current.playing;
    if (ending && navRef.isReady() && navRef.getCurrentRoute()?.name === 'Player') {
      navRef.navigate('Main', { screen: 'Home' });
    }
    sessionRef.current.dismissBigCeleb();
  }, []);

  // Proceed on font error too — system fonts beat a stuck splash.
  if ((!fontsLoaded && !fontError) || authState === 'checking') {
    return <View style={{ flex: 1, backgroundColor: colors.cream }} />;
  }

  return (
    <NavigationContainer
      ref={navRef}
      theme={navTheme}
      onStateChange={syncRoute}
      onReady={syncRoute}
    >
      <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack.Navigator
        initialRouteName={authState === 'in' ? 'Main' : 'Intro'}
        screenOptions={{ headerShown: false, animation: 'fade', animationDuration: 400 }}
      >
        <Stack.Screen name="Intro" component={IntroScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Email" component={EmailScreen} />
        <Stack.Screen name="Forgot" component={ForgotScreen} />
        <Stack.Screen name="Intake" component={IntakeScreen} />
        <Stack.Screen name="Build" component={BuildScreen} />
        <Stack.Screen name="Review" component={ReviewScreen} />
        <Stack.Screen name="Schedule" component={ScheduleScreen} />
        <Stack.Screen name="Paywall" component={PaywallScreen} />
        <Stack.Screen name="Creation" component={CreationScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Player" component={PlayerScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Friends" component={FriendsScreen} />
        <Stack.Screen name="Discover" component={DiscoverScreen} />
        <Stack.Screen name="Contacts" component={ContactsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="VoiceRecorder" component={VoiceRecorderScreen} options={{ animation: 'slide_from_bottom' }} />
      </Stack.Navigator>

      {/* Minimized player — hidden while the full player is open, and never
          shown during onboarding (there's no session to carry yet). */}
      {session.active && route !== 'Player' && (
        <MiniPlayer
          liftForTabs={onTabs}
          onExpand={() => navRef.isReady() && navRef.navigate('Player')}
        />
      )}

      {/* Session-complete celebration renders over WHATEVER screen is showing,
          then closes the mini player when dismissed. */}
      {session.bigCeleb && <SessionCeleb onDone={endSessionCeleb} />}
      </View>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        {/* Audio lives ABOVE the navigator so a session survives screen changes. */}
        <AudioSessionProvider>
          <Root />
        </AudioSessionProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
