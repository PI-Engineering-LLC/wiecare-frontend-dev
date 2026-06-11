import  { createContext, useState, useContext, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';

const ClientContext = createContext(null);

export const ClientProvider = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeClientId, setActiveClientId] = useState(() => {
    return localStorage.getItem('activeClientId') || undefined;
  });;

  useEffect(() => {
    // first client default
    if (  user?.memberships?.length   && (!activeClientId || !localStorage.getItem('activeClientId'))) {
      const clientId = user.memberships[0].clientId;
      
      localStorage.setItem('activeClientId', clientId)
      setActiveClientId(clientId);
      queryClient.invalidateQueries({ queryKey: ['authUser'] });
    }
  }, [user, activeClientId, queryClient]);

  function switchClient(clientId){
    localStorage.setItem('activeClientId', clientId)
    setActiveClientId(clientId)
    queryClient.clear();
    queryClient.invalidateQueries({ queryKey: ['authUser'] });
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
/**
 <select
  value={
    activeClientId
  }

  onChange={e =>
    // setActiveClientId(
    switchClient(
      e.target.value
    )
  }
>
  {
    user.memberships.map(
      m => (
        <option
          key={
            m.client.id
          }

          value={
            m.client.id
          }
        >
          {
            m.client.name
          }
        </option>
      )
    )
  }
</select>
 */