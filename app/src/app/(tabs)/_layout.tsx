import { NativeTabs } from 'expo-router/native-tabs';

import { alpha, useTheme } from '@/theme';

export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <NativeTabs
      backgroundColor={c.surface}
      indicatorColor={alpha(c.brand, 0.16)}
      labelStyle={{ default: { color: c.subtle }, selected: { color: c.brand } }}
      iconColor={{ default: c.subtle, selected: c.brand }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/home.png')} renderingMode="template" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="income">
        <NativeTabs.Trigger.Label>Income</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/income.png')} renderingMode="template" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="expenses">
        <NativeTabs.Trigger.Label>Expenses</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/expense.png')} renderingMode="template" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="budget">
        <NativeTabs.Trigger.Label>Budget</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/budget.png')} renderingMode="template" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="invest">
        <NativeTabs.Trigger.Label>Invest</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/invest.png')} renderingMode="template" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
