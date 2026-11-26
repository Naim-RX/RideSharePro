import {act,fireEvent,render,screen} from '@testing-library/react-native';
import CustomerBidsScreen from './CustomerBidsScreen';
import {createBidService,subscribeBids} from '../../services/bidService';
jest.mock('../../context/AuthContext',()=>({useAuth:()=>({session:{user:{id:'customer'}}})}));
jest.mock('@react-navigation/native',()=>({useFocusEffect:fn=>require('react').useEffect(fn,[fn])}));
jest.mock('../../services/bidService',()=>({...jest.requireActual('../../services/bidService'),createBidService:jest.fn(),subscribeBids:jest.fn()}));
test('empty comparison receives a realtime bid with name/rating/fare and cleans up',async()=>{
  const service={ride:jest.fn().mockResolvedValue({id:'ride',status:'open',pickup_label:'Gate',destination_label:'Library',expected_fare:180}),incoming:jest.fn().mockResolvedValue([])};
  createBidService.mockReturnValue(service);let refresh;const stop=jest.fn();subscribeBids.mockImplementation((uid,id,fn)=>{refresh=fn;return stop;});
  const view=await render(<CustomerBidsScreen route={{params:{rideId:'ride'}}} navigation={{goBack:jest.fn()}} />);
  expect(await screen.findByText('No bids yet')).toBeVisible();
  service.incoming.mockResolvedValue([{id:'bid',biker_name:'Test Biker',amount:150,status:'pending',rating_count:0}]);
  await act(async()=>{refresh();});expect(await screen.findByText('Test Biker')).toBeVisible();expect(screen.getByText('Rating: Not yet rated')).toBeVisible();expect(screen.getByText('BDT 150.00')).toBeVisible();
  expect(screen.queryByRole('button',{name:'Select biker'})).toBeNull();await view.unmount();expect(stop).toHaveBeenCalled();
});
test('loading does not show an empty state and failed pagination removes an invalid load-more action',async()=>{
  let resolveFirst;
  const rows=Array.from({length:20},(_,index)=>({id:`bid-${index}`,amount:index+1,status:'pending',biker_name:`Biker ${index}`,rating_count:0}));
  const service={ride:jest.fn().mockResolvedValue({id:'ride',status:'open',pickup_label:'Gate',destination_label:'Library',expected_fare:180}),incoming:jest.fn().mockImplementationOnce(()=>new Promise(resolve=>{resolveFirst=resolve;})).mockRejectedValueOnce(new Error('Network unavailable'))};
  createBidService.mockReturnValue(service);subscribeBids.mockImplementation(()=>()=>{});
  await render(<CustomerBidsScreen route={{params:{rideId:'ride'}}} navigation={{goBack:jest.fn()}} />);
  expect(screen.getByText('Loading bids…')).toBeVisible();expect(screen.queryByText('No bids yet')).toBeNull();
  await act(async()=>{resolveFirst(rows);});
  await fireEvent.press(screen.getByRole('button',{name:'Load more bids'}));
  expect(await screen.findByText('Network unavailable')).toBeVisible();
  expect(screen.queryByRole('button',{name:'Load more bids'})).toBeNull();
});
