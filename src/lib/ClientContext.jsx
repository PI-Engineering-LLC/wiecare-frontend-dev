import  { createContext, useState, useContext, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';

const ClientContext = createContext(null);

export const ClientProvider = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeClientId, setActiveClientId] = useState(() => {
    return localStorage.getItem('activeClientId') || undefined;
  });
  const navigate = useNavigate();

  useEffect(() => {
    // first client default
    if(activeClientId){
      localStorage.setItem('activeClientId', activeClientId)
      queryClient.invalidateQueries({ queryKey: ['authUser'] });
    }
    else if ( (user?.platform_role && activeClientId &&  user?.memberships?.length) ||
      (!user?.platform_role &&  user?.memberships?.length   && (!activeClientId || !localStorage.getItem('activeClientId')))) {
      const clientId = user.memberships[0].clientId;
      localStorage.setItem('activeClientId', clientId)
      setActiveClientId(clientId);
      queryClient.invalidateQueries({ queryKey: ['authUser'] });
    }
  }, [user, activeClientId, queryClient]);

  function switchClient(clientId){
    if(clientId === '__internal__' ){
      setActiveClientId(null)
    }else{
      localStorage.setItem('activeClientId', clientId)
      setActiveClientId(clientId)
    }
    queryClient.clear();
    queryClient.invalidateQueries({ queryKey: ['authUser'] });
    navigate('/');
  }

  return (
    <ClientContext.Provider value={{ activeClientId, switchClient }}>
      {children}
    </ClientContext.Provider>
  );
};



export const useClient = () => {
  const context = useContext(ClientContext);
  if (!context) {
    // throw new Error('useContext must be used within an ClientProvider');
  }
  return context;
};