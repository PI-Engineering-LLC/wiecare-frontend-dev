import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/AuthContext';
const BASE_URL = import.meta.env.VITE_APP_ASSETS_BASE_URL;

export const AvatarImg = ({ avatarKey, fallback, ...props }) => {

  const { user } = useAuth();
  const src = avatarKey ? `${BASE_URL}/${avatarKey}` : null; 
  return (
    <Avatar className="h-10 w-10">
      <AvatarImage src={src} />
      <AvatarFallback className="bg-[#1e3a5f] text-white text-xl">
        {fallback}
      </AvatarFallback>
    </Avatar>


  );
}

