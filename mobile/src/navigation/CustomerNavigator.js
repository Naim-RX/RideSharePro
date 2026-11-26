import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CustomerHomeScreen from '../screens/customer/CustomerHomeScreen';
import CustomerHistoryScreen from '../screens/customer/CustomerHistoryScreen';
import AccountScreen from '../screens/account/AccountScreen';
import { colors } from '../theme';
const Tab = createBottomTabNavigator();
function Profile() { return <AccountScreen role="customer" />; }
export default function CustomerNavigator() {
  return <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.secondary, tabBarLabelPosition: 'beside-icon', tabBarLabelStyle: { fontSize: 14, fontWeight: '500' }, tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border }, tabBarIcon: () => null }}>
    <Tab.Screen name="Home" component={CustomerHomeScreen} /><Tab.Screen name="History" component={CustomerHistoryScreen} /><Tab.Screen name="Profile" component={Profile} />
  </Tab.Navigator>;
}
