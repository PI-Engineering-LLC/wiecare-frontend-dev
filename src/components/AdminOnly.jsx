import React from 'react'; // Removed unused useState, useEffect
import { Shield, Lock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/lib/AuthContext';
import { usePlatformRole } from '@/hooks/usePlatfromRole';
// import { useClientRoles } from '@/hooks/useClientRoles'; // Removed, AdminOnly should not check client roles

export default function AdminOnly({ children, fallback = null }) {
  const { user, loading } = useAuth();
  const isInternalAdmin = usePlatformRole('super_admin') || usePlatformRole('platform_admin'); // Corrected 'admin' to 'platform_admin' as per backend

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a5f]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50 p-4">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg border border-slate-100">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-blue-100">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Sign In Required</h1>
            <p className="text-slate-600 mb-8">
              You need to sign in to access the admin portal.
            </p>
            <Button
              onClick={() => window.location.href = '/login'}
              className="w-full bg-[#1e3a5f] hover:bg-[#2d5a8a]"
            >
              Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If user is not an Internal Admin (super_admin or platform_admin)
  if (!isInternalAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50 p-4">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg border border-slate-100">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-rose-100">
              <Shield className="w-8 h-8 text-rose-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Access Denied</h1>
            <p className="text-slate-600 mb-8">
              You don't have permission to access the admin portal. Only platform administrators can access this area.
            </p>
            <div className="p-4 bg-slate-50 rounded-md text-sm text-slate-600 mb-6">
              <p className="font-medium mb-2">Current role: <span className="capitalize">{user.platform_role?.replace('_', ' ')}</span></p>
              <p>Contact your system administrator if you need platform admin access.</p>
            </div>
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>; // Render children if internal admin
}