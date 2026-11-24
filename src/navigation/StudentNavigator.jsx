import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FisicaHomeScreen } from '../modules/fisica';
import LogoutButton from '../shared/components/LogoutButton';

const Stack = createNativeStackNavigator();
export default function StudentNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerRight: () => <LogoutButton /> }}>
      <Stack.Screen
        name="Fisica"
        component={FisicaHomeScreen}
        options={{ title: 'FisiLab · Física' }}
      />
    </Stack.Navigator>
  );
}
