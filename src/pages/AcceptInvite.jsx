import React, { useState } from 'react';
import { useParams } from "react-router-dom";
import { api } from '@/api/apiClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from 'sonner';
import { CheckCircle, Eye, EyeOff } from 'lucide-react';

export default function AcceptInvite() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return toast.error('Passwords do not match');
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    try {
      const {success, nextStep,requireLogin, message}=await api.acceptInvite({ token, password });
      setDone(true);
    } catch (err) {
      toast.error(err.message);
    }
  };
  const handleGoogleActivate = () => {
    // Pass invite token as state through Google OAuth
    window.location.href = `${API_URL}/auth/google?invite_token=${token}`;
};

  if (done) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#f4f5f0' }}>
      <Card className="w-full max-w-md border-0 shadow-2xl rounded-2xl text-center p-8">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#edf0be' }}>
            <CheckCircle className="h-8 w-8" style={{ color: '#005f27' }} />
          </div>
        </div>
        <p className="text-xl font-bold text-slate-900">Account Activated!</p>
        <p className="text-slate-500 mt-2 text-sm">You can now sign in to your Wiegand USA Customer Portal account.</p>
        <Button
          className="mt-6 w-full h-11 font-semibold text-white"
          style={{ backgroundColor: '#005f27' }}
          onClick={() => window.location.href = '/login'}
        >
          Go to Login
        </Button>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#f4f5f0' }}>
      <Card className="w-full max-w-md border-0 shadow-2xl rounded-2xl">
        <div className="w-full h-32 flex items-center justify-center pt-4">
          <span className="flex shrink-0 overflow-hidden rounded-full h-16 w-16 shadow-lg ring-4 ring-white/50">
            <img
              className="aspect-square h-full w-full object-cover"
              alt="Wiegand USA Customer Portal logo"
              src="/wiecare_logo.png"
            />
          </span>
        </div>
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold text-slate-900">Set Your Password</CardTitle>
          <CardDescription className="text-slate-500">Create a password for your Wiegand USA Customer Portal account</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <Button variant="outline" className="w-full flex items-center gap-2 h-11" onClick={handleGoogleActivate}>
                      <GoogleIcon />
                      <span>Continue with Google</span>
                    </Button>
          
                    <div className="relative flex items-center">
                      <Separator className="flex-1" />
                      <span className="px-3 text-xs uppercase text-muted-foreground">or</span>
                      <Separator className="flex-1" />
                    </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>New Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Confirm Password</Label>
              <div className="relative">
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-11 font-semibold text-white"
              style={{ backgroundColor: '#005f27' }}
            >
              Activate Account
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
function GoogleIcon() {
  return (
    <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}