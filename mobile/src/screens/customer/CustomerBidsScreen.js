import {useCallback,useRef,useState} from 'react';
import {AppState,Text} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Screen from '../../components/Screen';
import {BidCard,EmptyState,ErrorMessage,LoadingIndicator,RideCard,ScreenHeader,SecondaryButton} from '../../components';
import {useAuth} from '../../context/AuthContext';
import {comparisonCard,createBidService,subscribeBids} from '../../services/bidService';
import {rideCardData} from '../../services/rideService';
import {colors,typography} from '../../theme';
export default function CustomerBidsScreen({navigation,route}) {
  const uid=useAuth().session.user.id,rideId=route.params?.rideId;
  const [ride,setRide]=useState(null),[bids,setBids]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[more,setMore]=useState(false),[connected,setConnected]=useState(true);
  const version=useRef(0);
  const load=useCallback(async(cursor=null)=>{
    const current=++version.current;setLoading(true);setError('');
    try{
      const service=createBidService();const [record,data]=await Promise.all([service.ride(rideId,uid),service.incoming(rideId,cursor)]);
      if(current===version.current){setRide(record);setBids(previous=>cursor?[...previous,...data.filter(row=>!previous.some(old=>old.id===row.id))]:data);setMore(data.length===20);}
    }catch(e){if(current===version.current){setError(e.message);setRide(null);setBids([]);setMore(false);}}
    finally{if(current===version.current)setLoading(false);}
  },[uid,rideId]);
  useFocusEffect(useCallback(()=>{
    load();const stop=subscribeBids(uid,rideId,()=>load(),setConnected);
    const app=AppState.addEventListener('change',state=>{if(state==='active')load();});
    return()=>{version.current++;stop();app.remove();};
  },[uid,rideId,load]));
  return <Screen><ScreenHeader title="Incoming bids" subtitle="Compare fare offers, lowest fare first." onBack={()=>navigation.goBack()} />
    {ride?<RideCard ride={rideCardData(ride)} />:null}
    {ride && ride.status!=='open'?<Text style={styles.text}>This ride is {ride.status}. New bids are closed.</Text>:null}
    {!connected?<ErrorMessage message="Live updates disconnected. Refresh to check the latest bids." />:null}
    {loading?<LoadingIndicator label="Loading bids…" />:null}<ErrorMessage message={error} onRetry={()=>load()} />
    {bids.map(bid=><BidCard key={bid.id} bid={comparisonCard(bid)} />)}
    {!loading && !error && !bids.length?<EmptyState title="No bids yet" message={ride?.status==='open'?'Biker fare offers will appear here automatically.':'No fare offers were received.'} />:null}
    {more?<SecondaryButton title="Load more bids" disabled={loading} onPress={()=>load(bids.at(-1))} />:null}
    <SecondaryButton title="Refresh bids" disabled={loading} onPress={()=>load()} />
  </Screen>;
}
const styles={text:{...typography.body,color:colors.secondary}};
