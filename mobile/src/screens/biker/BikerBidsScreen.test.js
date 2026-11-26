import{fireEvent,render,screen}from'@testing-library/react-native';
import BikerBidsScreen from './BikerBidsScreen';
import{createBidService}from'../../services/bidService';
jest.mock('../../context/AuthContext',()=>({useAuth:()=>({session:{user:{id:'biker'}}})}));
jest.mock('@react-navigation/native',()=>({useFocusEffect:fn=>require('react').useEffect(fn,[fn])}));
jest.mock('../../services/bidService',()=>({createBidService:jest.fn(),subscribeBids:()=>()=>{}}));
test('failed archive pagination shows error without a stale load-more control',async()=>{
  const rows=Array.from({length:20},(_,index)=>({id:`bid-${index}`,amount:index+1,status:'pending',pickup_label:'Gate',destination_label:'Library',ride_status:'open'}));
  createBidService.mockReturnValue({mine:jest.fn().mockResolvedValueOnce(rows).mockRejectedValueOnce(new Error('Archive unavailable'))});
  await render(<BikerBidsScreen navigation={{goBack:jest.fn()}} />);
  await fireEvent.press(await screen.findByRole('button',{name:'Load more bids'}));
  expect(await screen.findByText('Archive unavailable')).toBeVisible();
  expect(screen.queryByRole('button',{name:'Load more bids'})).toBeNull();
});
