import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import BikerHomeScreen from '../screens/biker/BikerHomeScreen';
import BikerHistoryScreen from '../screens/biker/BikerHistoryScreen';
import BikerProfileScreen from '../screens/biker/BikerProfileScreen';
import { colors } from '../theme';
const Tab = createBottomTabNavigator();
export default function BikerNavigator() {
  return <Tab.Navigator screenOptions={{ headerShown:false,tabBarActiveTintColor:colors.primary,tabBarInactiveTintColor:colors.secondary,tabBarLabelPosition:'beside-icon',tabBarLabelStyle:{fontSize:14,fontWeight:'500'},tabBarStyle:{backgroundColor:colors.surface,borderTopColor:colors.border},tabBarIcon:()=>null }}>
    <Tab.Screen name="Home" component={BikerHomeScreen} /><Tab.Screen name="History" component={BikerHistoryScreen} /><Tab.Screen name="Profile" component={BikerProfileScreen} />
  </Tab.Navigator>;
}
