// @ts-nocheck
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { useAuth } from '@/lib/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';


export default function AuthCallback() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('Verifying session...');

    useEffect(() => {
        const error = params.get('error');
        const next = params.get('next') || '/'; // Get the 'next' URL from params, default to '/'
        
        if (error) {
            if (error === 'not_invited' || error === 'not_registered') {
              navigate(`/login?error=${error}`, { replace: true });
              return;
            }
            navigate('/login?error=auth_failed', { replace: true });
            return;
          }
          queryClient.invalidateQueries({ queryKey: ['authUser'] })
      .then(() => {
        // Successfully fetched the user profile using the new cookies!
        navigate(next, { replace: true });
      })
      .catch((err) => {
        console.error("OAuth session bootstrap failed:", err);
        navigate('/login?error=session_failed', { replace: true });
      });
        
    },[params, navigate, queryClient]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#f4f5f0' }}>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <Card className="w-full max-w-md border-0 shadow-2xl rounded-2xl text-center p-8">
                <p className="text-center mt-20">{status}</p>
            </Card>
        </div>
    );
}
