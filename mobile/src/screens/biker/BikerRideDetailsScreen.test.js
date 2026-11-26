import {fireEvent,render,screen} from '@testing-library/react-native';
import BikerRideDetailsScreen from './BikerRideDetailsScreen';
import {createBikerService} from '../../services/bikerService';
jest.mock('../../context/AuthContext',()=>({useAuth:()=>({session:{user:{id:'biker'}}})}));
jest.mock('@react-navigation/native',()=>({useFocusEffect:callback=>require('react').useEffect(callback,[callback])}));
jest.mock('../../services/bikerService',()=>({...jest.requireActual('../../services/bikerService'),createBikerService:jest.fn(),subscribeBiker:()=>()=>{}}));
test('validates proposed fare beside the field and submits a bid without assignment',async()=>{
  const detail=jest.fn().mockResolvedValue({id:'ride',pickup_label:'Gate',destination_label:'Library',expected_fare:180,status:'open'});
  const bid=jest.fn().mockResolvedValue('bid');createBikerService.mockReturnValue({detail,bid});
  await render(<BikerRideDetailsScreen route={{params:{rideId:'ride'}}} navigation={{goBack:jest.fn()}} />);
  await screen.findByText('Gate');
  await fireEvent.changeText(screen.getByLabelText('Proposed fare (BDT)'),'0');
  await fireEvent.press(screen.getByRole('button',{name:'Submit Bid'}));
  expect(screen.getByText('Enter a positive BDT fare with at most two decimal places.')).toBeVisible();expect(bid).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText('Proposed fare (BDT)'),'170');
  await fireEvent.press(screen.getByRole('button',{name:'Submit Bid'}));
  expect(bid).toHaveBeenCalledWith('ride','170');expect(await screen.findByText('Bid submitted. Your fare offer is pending.')).toBeVisible();
});
