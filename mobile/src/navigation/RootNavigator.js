import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import AuthNavigator from './AuthNavigator';
import SplashScreen from '../screens/auth/SplashScreen';
import Screen from '../components/Screen';
import LoadingIndicator from '../components/LoadingIndicator';
import SecondaryButton from '../components/SecondaryButton';
import AccountScreen from '../screens/account/AccountScreen';
import AccountAccessScreen from '../screens/account/AccountAccessScreen';
import CustomerNavigator from './CustomerNavigator';
import CustomerRoutePreviewScreen from '../screens/customer/CustomerRoutePreviewScreen';
import CustomerPostRideScreen from '../screens/customer/CustomerPostRideScreen';
import BikerNavigator from './BikerNavigator';
import BikerRideDetailsScreen from '../screens/biker/BikerRideDetailsScreen';
import CustomerBidsScreen from '../screens/customer/CustomerBidsScreen';
import BikerBidsScreen from '../screens/biker/BikerBidsScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();
const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: colors.primary, background: colors.background, card: colors.surface, text: colors.text, border: colors.border } };
function CustomerAccount() { return <CustomerNavigator />; }
function BikerAccount() { return <BikerNavigator />; }
function AdminAccount() { return <AccountScreen role="admin" />; }

export default function RootNavigator() {
  const auth = useAuth();
  if (auth.phase === 'restoring') return <SplashScreen />;
  if (['loading_profile', 'signing_out'].includes(auth.phase)) {
    return (
      <Screen>
        <LoadingIndicator label={auth.phase === 'signing_out' ? 'Signing out…' : 'Checking your account…'} />
        {auth.phase === 'loading_profile' ? <SecondaryButton title="Logout" onPress={auth.logout} /> : null}
      </Screen>
    );
  }
  if (auth.phase === 'signed_out') return <AuthNavigator />;
  if (auth.phase !== 'authenticated') return <AccountAccessScreen />;
  const destinations = { customer: CustomerAccount, biker: BikerAccount, admin: AdminAccount };
  const Home = destinations[auth.profile.role];
  if (!Home) return <AccountAccessScreen />;
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'none' }}>
        <Stack.Screen name={`${auth.profile.role}Account`} component={Home} />
        {auth.profile.role === 'customer' ? <>
          <Stack.Screen name="CustomerRoutePreview" component={CustomerRoutePreviewScreen} />
          <Stack.Screen name="CustomerPostRide" component={CustomerPostRideScreen} />
          <Stack.Screen name="CustomerBids" component={CustomerBidsScreen} />
        </> : null}
        {auth.profile.role === 'biker' ? <><Stack.Screen name="BikerRideDetails" component={BikerRideDetailsScreen} /><Stack.Screen name="BikerBids" component={BikerBidsScreen} /></> : null}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
