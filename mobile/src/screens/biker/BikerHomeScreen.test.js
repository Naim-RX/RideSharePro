import { fireEvent, render, screen, act } from '@testing-library/react-native';
import BikerHomeScreen from './BikerHomeScreen';
import { createBikerService, subscribeBiker } from '../../services/bikerService';
jest.mock('../../context/AuthContext',()=>({useAuth:()=>({session:{user:{id:'biker'}}})}));
jest.mock('@react-navigation/native',()=>({useFocusEffect: callback=>require('react').useEffect(callback,[callback])}));
jest.mock('../../services/bikerService',()=>({...jest.requireActual('../../services/bikerService'),createBikerService:jest.fn(),subscribeBiker:jest.fn()}));
test('offline state, online switch, empty state and Realtime refresh clean up on unmount', async () => {
  let online=false; let refresh; const stop=jest.fn();
  const service={status:jest.fn(async()=>({is_online:online})),availability:jest.fn(async value=>{online=value;}),list:jest.fn(async()=>[])};
  createBikerService.mockReturnValue(service); subscribeBiker.mockImplementation((uid,handler)=>{refresh=handler;return stop;});
  const view=await render(<BikerHomeScreen navigation={{navigate:jest.fn()}} />);
  expect(await screen.findByText('You are offline')).toBeVisible();
  await fireEvent(screen.getByLabelText('Biker availability'),'valueChange',true);
  expect(await screen.findByText('No available rides')).toBeVisible();
  service.list.mockResolvedValue([{id:'ride',pickup_label:'Gate',destination_label:'Library',expected_fare:100,status:'open'}]);
  await act(async()=>{refresh();});
  expect(await screen.findByText('Gate')).toBeVisible();
  await view.unmount(); expect(stop).toHaveBeenCalled();
});
