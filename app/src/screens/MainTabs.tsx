import React from 'react';
import { Text, View, Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, fonts } from '../theme';
import { useStore } from '../store';
import HomeScreen from './HomeScreen';
import FeedScreen from './social/FeedScreen';
import ProgressScreen from './ProgressScreen';
import ProfileScreen from './ProfileScreen';

export type TabsParamList = {
  Home: undefined;
  Feed: undefined;
  Progress: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabsParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const glyphs: Record<string, string> = { Home: '⌂', Feed: '◎', Progress: '◔' };
  return (
    <Text style={{ fontSize: 22, color: focused ? colors.ink : colors.inactive }}>
      {glyphs[label] ?? '•'}
    </Text>
  );
}

function ProfileTabIcon({ focused }: { focused: boolean }) {
  const uri = useStore(s => s.profilePhotoUri);
  if (uri) {
    return <Image source={{ uri }} style={{ width: 24, height: 24, borderRadius: 12, borderWidth: focused ? 1.5 : 0, borderColor: colors.ink }} />;
  }
  return (
    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: focused ? colors.ink : colors.inactive, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 11, fontFamily: fonts.sansSemi, color: colors.cream }}>T</Text>
    </View>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.cream, borderTopWidth: 1, borderTopColor: colors.borderSoft, height: 84, paddingTop: 8 },
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inactive,
        tabBarLabelStyle: { fontFamily: fonts.sans, fontSize: 11 },
        tabBarIcon: ({ focused }) =>
          route.name === 'Profile' ? <ProfileTabIcon focused={focused} /> : <TabIcon label={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
