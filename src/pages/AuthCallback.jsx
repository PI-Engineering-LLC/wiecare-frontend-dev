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
        // if (error === 'not_invited') {
        //     window.location.href = '/login?error=not_invited';
        //     return;
        // }
        // if (!token) {
        //     window.location.href = '/login?error=missing_token';
        //     return;
        // }
        // if(token){
        //     localStorage.setItem("token", token);
        //     window.location.href = '/';
        // }

        // if (token) {
        //     handleOAuthTokenLogin(token) // Use the new function here
        //         .then(() => {
        //             console.log("##HOME");
        //             // window.location.href = '/'
        //             // window.location.href = next;
        //         })
        //         .catch((err) => {
        //             console.error("OAuth Login failed:", err);
        //             window.location.href = '/login?error=auth_failed';
        //         });
        // }
    },[params, navigate, queryClient]);
    // , [handleOAuthTokenLogin]); // Add handleOAuthTokenLogin to dependency array

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#f4f5f0' }}>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <Card className="w-full max-w-md border-0 shadow-2xl rounded-2xl text-center p-8">
                <p className="text-center mt-20">{status}</p>
            </Card>
        </div>
    );
}
// // @ts-nocheck
// import { useEffect, useState } from 'react';
// import { useSearchParams, useNavigate } from 'react-router-dom';
// import { Card } from "@/components/ui/card";
// import { api } from '@/api/apiClient';
// import { AuthProvider, useAuth } from '@/lib/AuthContext';


// export default function AuthCallback() {
//     const [params] = useSearchParams();
//     const [status, setStatus] = useState('Signing you in...');
//     const { login, token, user } = useAuth();

//     useEffect(() => {
//         const token = params.get('token');
//         const error = params.get('error');

//         if (error === 'not_invited') {
//             window.location.href =  '/login?error=not_invited';
//             return;
//         }
//         if (!token) {
//             window.location.href = '/login?error=missing_token';
//             return;
//         }

//         if (token) {
//             // api.setToken(token)

//         //      // Now safely fetch the user — no sensitive data in URL
//         //     api.me().then((user) => {
//         //         if (!user) {
//         //             window.location.href = '/login?error=auth_failed';
//         //             return;
//         //         }

//         //     // Store user in state/context — never in localStorage
//         //     // e.g. dispatch({ type: 'SET_USER', payload: user })
//         //     // or use a React context setter

//         //     window.location.href = '/';
//         // });
//         localStorage.setItem("token", token);
//         // window.location.href = '/';

            
//         }

       


//     }, []);

//     // return <div className="text-center mt-20">Signing you in...</div>;
//     return (
//         <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#f4f5f0' }}>
//       <Card className="w-full max-w-md border-0 shadow-2xl rounded-2xl text-center p-8">
//       <p className="text-center mt-20">Signing you in...</p>
//         {/* <div className="flex justify-center mb-4">
//           <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#edf0be' }}>
//             <CheckCircle className="h-8 w-8" style={{ color: '#005f27' }} />
//           </div>
//         </div> */}
//         {/* <p className="text-xl font-bold text-slate-900">Account Activated!</p>
//         <p className="text-slate-500 mt-2 text-sm">You can now sign in to your WieCare account.</p>
//      */}
//       </Card>
//     </div>
//     )
// }