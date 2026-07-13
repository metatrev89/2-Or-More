import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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

import IntroScreen from './screens/onboarding/IntroScreen';
import SignupScreen from './screens/onboarding/SignupScreen';
import EmailScreen from './screens/onboarding/EmailScreen';
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

export type RootStackParamList = {
  Intro: undefined;
  Signup: undefined;
  Email: { email?: string } | undefined;
  Intake: undefined;
  Build: undefined;
  Review: undefined;
  Schedule: undefined;
  Paywall: undefined;
  Creation: undefined;
  Main: undefined;
  Player: { mode: 'audio' | 'movie' };
  Friends: undefined;
  Discover: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

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
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: colors.cream }} />;

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="dark" />
      <Stack.Navigator
        initialRouteName="Intro"
        screenOptions={{ headerShown: false, animation: 'fade', animationDuration: 400 }}
      >
        <Stack.Screen name="Intro" component={IntroScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Email" component={EmailScreen} />
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  );
}
