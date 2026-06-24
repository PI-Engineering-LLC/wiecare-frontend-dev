import React, { useState } from 'react';
import { useParams } from "react-router-dom";
import { api } from '@/api/apiClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from 'sonner';
import { CheckCircle, Eye, EyeOff } from 'lucide-react';

export default function ResetPassword() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return toast.error('Passwords do not match');
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    try {
      await api.resetPassword({ token, password });
      setDone(true);
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (done) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#f4f5f0' }}>
      <Card className="w-full max-w-md border-0 shadow-2xl rounded-2xl text-center p-8">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#edf0be' }}>
            <CheckCircle className="h-8 w-8" style={{ color: '#005f27' }} />
          </div>
        </div>
        <p className="text-xl font-bold text-slate-900">Account Password Reset!</p>
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
              src="wiecare_logo.png"
            />
          </span>
        </div>
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold text-slate-900">Set Your Password</CardTitle>
          <CardDescription className="text-slate-500">Create a password for your Wiegand USA Customer Portal account</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
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
              Reset Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}