import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, Text, View } from 'react-native';
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
import MainTabs from './screens/MainTabs';
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
  Main: undefined;
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
  const moods = useStore(s => s.moods);
  const [route, setRoute] = React.useState('');
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

  // Proceed on font error too — system fonts beat a stuck splash.
  if ((!fontsLoaded && !fontError) || authState === 'checking') {
    return <View style={{ flex: 1, backgroundColor: colors.cream }} />;
  }

  return (
    <NavigationContainer
      ref={navRef}
      theme={navTheme}
      onStateChange={() => setRoute(navRef.getCurrentRoute()?.name ?? '')}
      onReady={() => setRoute(navRef.getCurrentRoute()?.name ?? '')}
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
          liftForTabs={route === 'Main'}
          onExpand={() => navRef.isReady() && navRef.navigate('Player')}
        />
      )}

      {/* Session-complete celebration renders over WHATEVER screen is showing,
          then closes the mini player when dismissed. */}
      {session.bigCeleb && (
        <SessionCeleb
          autoDismiss={moods[`audio-${new Date().toDateString()}`] !== undefined}
          onDone={session.dismissBigCeleb}
        />
      )}
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
