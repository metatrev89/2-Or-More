import React from 'react';
import { Text, View, Image } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, fonts } from '../theme';
import { useStore } from '../store';
import HomeScreen from './HomeScreen';
import FeedScreen from './social/FeedScreen';
import ProgressScreen from './ProgressScreen';
import FriendsScreen from './social/FriendsScreen';
import ProfileScreen from './ProfileScreen';

export type TabsParamList = {
  Home: undefined;
  Feed: undefined;
  Progress: undefined;
  Friends: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabsParamList>();

/** Per-tab active tints from the design's nav bars (each screen lights its own color). */
const ACTIVE: Record<keyof TabsParamList, string> = {
  Home: colors.ink,
  Feed: colors.gold,
  Progress: colors.teal,
  Friends: '#5C5142',
  Profile: colors.ink,
};

/** Nav glyphs — verbatim 24px / 1.9-stroke paths from the design bundle. */
function NavIcon({ name, color }: { name: keyof TabsParamList; color: string }) {
  const common = {
    width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none' as const,
    stroke: color, strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  };
  if (name === 'Home') return (
    <Svg {...common}>
      <Path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5z" />
    </Svg>
  );
  if (name === 'Feed') return (
    <Svg {...common}>
      <Path d="M10.5 5c.45 2.5 1.1 4.1 2.25 5.25C13.9 11.4 15.5 12.05 18 12.5c-2.5.45-4.1 1.1-5.25 2.25C11.6 15.9 10.95 17.5 10.5 20c-.45-2.5-1.1-4.1-2.25-5.25C7.1 13.6 5.5 12.95 3 12.5c2.5-.45 4.1-1.1 5.25-2.25C9.4 9.1 10.05 7.5 10.5 5z" />
      <Path d="M18.5 3c.2 1.1.5 1.85 1 2.35.5.5 1.25.8 2.35 1-1.1.2-1.85.5-2.35 1-.5.5-.8 1.25-1 2.35-.2-1.1-.5-1.85-1-2.35-.5-.5-1.25-.8-2.35-1 1.1-.2 1.85-.5 2.35-1 .5-.5.8-1.25 1-2.35z" />
    </Svg>
  );
  if (name === 'Progress') return (
    <Svg {...common}>
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="M8.3 12.3l2.5 2.5 4.9-5.6" />
    </Svg>
  );
  // Friends
  return (
    <Svg {...common}>
      <Path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <Circle cx={10} cy={7} r={4} />
      <Path d="M23 21v-2a4 4 0 0 0-3.2-3.9" />
      <Path d="M16 3.1a4 4 0 0 1 0 7.8" />
    </Svg>
  );
}

/** Profile tab = your avatar (design navAvatar): photo with ink ring when active, else initial disc. */
function ProfileTabIcon({ focused }: { focused: boolean }) {
  const uri = useStore(s => s.profilePhotoUri);
  const userName = useStore(s => s.userName);
  if (uri) {
    return (
      <Image source={{ uri }} style={{
        width: 24, height: 24, borderRadius: 12,
        borderWidth: focused ? 1.5 : 0, borderColor: colors.ink,
      }} />
    );
  }
  return (
    <View style={{
      width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
      backgroundColor: focused ? colors.ink : colors.inactive,
    }}>
      <Text style={{ fontSize: 11, fontFamily: fonts.sansSemi, color: colors.cream }}>
        {(userName || 'T').charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

function label(name: keyof TabsParamList) {
  return ({ focused }: { focused: boolean }) => (
    <Text style={{
      fontFamily: focused ? fonts.sansMedium : fonts.sans,
      fontSize: 11,
      color: focused ? ACTIVE[name] : colors.inactive,
    }}>
      {name}
    </Text>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const name = route.name as keyof TabsParamList;
        return {
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.cream,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            height: 88,
            paddingTop: 12,
          },
          tabBarLabel: label(name),
          tabBarIcon: ({ focused }) =>
            name === 'Profile'
              ? <ProfileTabIcon focused={focused} />
              : <NavIcon name={name} color={focused ? ACTIVE[name] : colors.inactive} />,
        };
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Friends" component={FriendsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
