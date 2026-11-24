import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TeacherHomeScreen from '../app/screens/TeacherHomeScreen';
import LogoutButton from '../shared/components/LogoutButton';

const Stack = createNativeStackNavigator();
export default function TeacherNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerRight: () => <LogoutButton /> }}>
      <Stack.Screen
        name="Docente"
        component={TeacherHomeScreen}
        options={{ title: 'FisiLab · Panel docente' }}
      />
    </Stack.Navigator>
  );
}
