import React from 'react';
import { Tabs } from 'expo-router';
import { CustomTabBar } from '@/components/CustomTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { position: 'absolute' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Gallery',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
        }}
      />
    </Tabs>
  );
}