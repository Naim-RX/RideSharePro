import {useCallback,useRef,useState} from 'react';
import {AppState,Text} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Screen from '../../components/Screen';
import {BidCard,EmptyState,ErrorMessage,LoadingIndicator,ScreenHeader,SecondaryButton} from '../../components';
import {useAuth} from '../../context/AuthContext';
import {createBidService,subscribeBids} from '../../services/bidService';
import {colors,typography} from '../../theme';
export default function BikerBidsScreen({navigation}) {
  const uid=useAuth().session.user.id;const [bids,setBids]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[more,setMore]=useState(false),[connected,setConnected]=useState(true);const version=useRef(0);
  const load=useCallback(async(cursor=null)=>{
    const current=++version.current;setLoading(true);setError('');
    try{const data=await createBidService().mine(cursor);if(current===version.current){setBids(previous=>cursor?[...previous,...data.filter(row=>!previous.some(old=>old.id===row.id))]:data);setMore(data.length===20);}}
    catch(e){if(current===version.current){setError(e.message);setBids([]);setMore(false);}}
    finally{if(current===version.current)setLoading(false);}
  },[]);
  useFocusEffect(useCallback(()=>{
    load();const stop=subscribeBids(uid,null,()=>load(),setConnected);const app=AppState.addEventListener('change',state=>{if(state==='active')load();});
    return()=>{version.current++;stop();app.remove();};
  },[uid,load]));
  return <Screen><ScreenHeader title="My bids" onBack={()=>navigation.goBack()} />
    {!connected?<ErrorMessage message="Live updates disconnected. Refresh to check your bid status." />:null}
    {loading?<LoadingIndicator label="Loading your bids…" />:null}<ErrorMessage message={error} onRetry={()=>load()} />
    {bids.map(bid=><BidCard key={bid.id} bid={{bikerName:`${bid.pickup_label} → ${bid.destination_label}`,motorcycleLabel:`Ride: ${bid.ride_status}`,status:bid.status,fareLabel:`BDT ${Number(bid.amount).toFixed(2)}`}} />)}
    {!loading && !error && !bids.length?<EmptyState title="No submitted bids" message="Your fare offers and their status will appear here." />:null}
    <Text style={{...typography.caption,color:colors.secondary}}>Pending offers are not confirmed bookings.</Text>
    {more?<SecondaryButton title="Load more bids" disabled={loading} onPress={()=>load(bids.at(-1))} />:null}<SecondaryButton title="Refresh bids" disabled={loading} onPress={()=>load()} />
  </Screen>;
}
